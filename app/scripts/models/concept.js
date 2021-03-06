// Declare app level module which depends on filters, and services
angular.module('app.services.concept', ['app.config', 'app.services.backend', 'app.directives.altlabels', 'app.directives.term'])

.factory('Concept', ['$q', '$rootScope', '$timeout', '$sce', 'Backend', 'config', function($q, $rootScope, $timeout, $sce, Backend, config) {
  'use strict';

  var libCodeMapping = {
    'ns': 'http://data.ub.uio.no/entity/4d8d8554-b5f9-43be-a21e-46d058a3ee1c',
    'na': 'http://data.ub.uio.no/entity/d5a885cd-56a0-4501-9c99-418db3fbcbdb',
    'nf': 'http://data.ub.uio.no/entity/c331c5e9-726c-4c55-9341-72d3e7874d6b',
    'nb': 'http://data.ub.uio.no/entity/8dce39ea-409f-4072-b25b-377a69bca0a3',
    'nc': 'http://data.ub.uio.no/entity/e31b973e-b1b4-4768-9d47-4151aa54fefd',
    'ne': 'http://data.ub.uio.no/entity/37f033b8-c77e-4fef-bdef-273f9065265d',
    'nk': 'http://data.ub.uio.no/entity/4d8d7781-2753-4d38-9ef9-de6c8cea4107',
    'ni': 'http://data.ub.uio.no/entity/c0f08a3c-12ed-410a-b810-d8be5c48571b',
    'nm': 'http://data.ub.uio.no/entity/aa780674-ac5f-40b2-a5a6-7912901f6d5f',
    'ngh': 'http://data.ub.uio.no/entity/e31b973e-b1b4-4768-9d47-4151aa54fefd',  // ???
  };

  function Concept(id, uri, label) {
    var that = this;
    that.dirty = false;
    that.loading = false;
    that.wpWorking = false;
    that.saving = false;
    that.saved = false;
    that.error = null;
    that.id = id;
    that.uri = uri;
    that.label = label;
    that.status = 'minimal';  // 'complete', 'saving', 'saved'
    that.data = null;
    that.candidates = [];
    that.selectedCandidate = -1;
    that.recommended = [];
  }

  Concept.prototype = {

    constructor: Concept,

    isLoaded: function() {
      return this.data;
    },

    setData: function(data) {
      // If no (editable) editorialNote field, create one
      if (!data.editorialNote) {
        data.editorialNote = [{ value: '' }];
      } else if (data.editorialNote[0].readonly) {
        data.editorialNote.push({ value: '' });        
      }

      if (!data.altLabel || !Object.keys(data.altLabel).length) data.altLabel = {};
      config.languages.forEach(function(lng) {
        // There should be at least one text field, so we add
        // one if there are none.
        if (!data.prefLabel[lng]) data.prefLabel[lng] = [{ value: '' }];
        if (!data.altLabel[lng]) data.altLabel[lng] = [{ value: '' }];
      });
      this.ensureBlankFields(data);
      this.generateHints(data);

      var oldLabel = this.label;
      this.label = data.prefLabel.nb[0].value;
      this.data = data;
      this.originalData = angular.copy(data);
      if (oldLabel != this.label) {
        $rootScope.$broadcast('conceptLabelChanged', this);
      }

      var subject = encodeURIComponent(this.label);
      var ident = data.identifier[0].value;
      var uri_id = this.uri.split('/').pop();
      this.emnesokUrl= 'https://app.uio.no/ub/emnesok/realfagstermer/search?id=' + encodeURIComponent(uri_id);
      this.katapiUrl = 'http://ub-viz01.uio.no/okapi2/#/search?q=' + encodeURIComponent('realfagstermer:"' + this.label + '"');
      this.soksedUrl = 'http://ub-soksed.uio.no/concepts/' + ident ;
      var body = encodeURIComponent('\n\n\n\n---\n*' + ident + ' (' + this.label + ') i [Emnesøk](' + this.emnesokUrl + '), [Skosmos]('+ this.uri + '), [Okapi](' + this.katapiUrl + '), [Soksed](' + this.soksedUrl + ')*');
      this.githubUrl = 'https://github.com/realfagstermer/realfagstermer/issues/new?title=' + subject + '&body=' + body;
    },

    toggleSelectedCandidate: function(idx, toTrue) {
      if (toTrue || this.selectedCandidate != idx) {
        this.selectedCandidate = idx;
        this.data.wikidataItem = [this.candidates[idx].uri];
      } else {
        this.selectedCandidate = -1;
        this.data.wikidataItem = [];
      }
    },

    keyDown: function(idx, event) {
      if (event.keyCode == 32) {
        this.toggleSelectedCandidate(idx);
      }
    },

    toggleCategory: function(catUri) {
      if (~this.data.member.indexOf(catUri)) {
        this.data.member.splice(this.data.member.indexOf(catUri), 1);
      } else {
        this.data.member.push(catUri);
      }
    },

    testDirty: function() {
      this.dirty = ! angular.equals(this.data, this.originalData);
      // if (this.dirty) this.saved = false;
      this.ensureBlankFields(this.data);
    },

    generateHints: function(data) {
      var m;

      data.prefLabel.nn[0].hints = [];
      if (data.prefLabel.nb[0].value) {
        data.prefLabel.nn[0].hints.push(data.prefLabel.nb[0].value);
      }
      m = data.prefLabel.nb[0].value.match('^(.*)er$');
      if (m) {
        data.prefLabel.nn[0].hints.push(m[1] + 'ar');
      }
      for (var i = 0; i < Math.min(data.altLabel.nn.length, data.altLabel.nb.length); i++) {
        data.altLabel.nn[i].hints = [];
        if (data.altLabel.nb[i].value) {
          data.altLabel.nn[i].hints.push(data.altLabel.nb[i].value);
        }
        m = data.altLabel.nb[i].value.match('^(.*)er$');
        if (m) {
          data.altLabel.nn[i].hints.push(m[1] + 'ar');
        }
      }
    },

    loadCandidateByUri: function(uri, select) {
      var that = this;
      that.wpWorking = true;
      console.log('[loadCandidate] By URI: ', uri);

      Backend.getWikidata(uri).then(function(data) {
        if (data.id) {
          if (!data.extract && data.descriptions.en) {
            // Only on wikidata, not on wikipedia
            data.extract = data.descriptions.en.value;
          }
          var ids = that.candidates.map(function(s){ return s.id; });
          if (ids.indexOf(data.id) == -1) {
            console.log('Adding candidate', data);
            that.candidates.push(data);
            if (select) {
              that.toggleSelectedCandidate(that.candidates.length - 1, true);
            }
          } else {
            if (select) {
              that.toggleSelectedCandidate(ids.indexOf(data.id), true);
            }
          }
        }
        that.wpWorking = false;
        //that.selectedCandidate = 0;
      }, function() {
        alert('FAIL!');
        that.wpWorking = false;
      });
    },

    loadCandidate: function(terms) {
      var that = this, fn;
      that.wpWorking = true;

      console.log('[loadCandidate] Looking up: ', terms);

      Backend.getWikipedia(terms[0]).then(function(data) {
        if (data.id) {
          console.log('[loadCandidate] Match at Wikipedia');
          if (!data.extract && data.descriptions.en) {
            // Only on wikidata, not on wikipedia
            data.extract = data.descriptions.en.value;
          }

          var ids = that.candidates.map(function(s){ return s.id; });
          if (ids.indexOf(data.id) == -1) {
            console.log('Adding candidate', data);
            that.candidates.push(data);
          }
        }
        that.wpWorking = false;
      }, function() {
        alert('Failed to load Wikidata candidate. Temporary server issues?');
        that.wpWorking = false;
      });

      function checkNextCandidate() {
        var term = terms.shift();
        Backend.searchWikidata(term).then(function(data) {
          if (data.results.length) {
            console.log('[loadCandidate] Match at Wikidata');
            that.loadCandidateByUri(data.results[0].concepturi, false);
            if (data.results.length > 1) {
              that.loadCandidateByUri(data.results[1].concepturi, false);
            }
          } else if (terms.length) {
            checkNextCandidate();
          }
        });
      }
      checkNextCandidate();
    },

    /**
     * Make sure there is always one blank field at the end of the term list to add new data to
     * for each language
     */
    ensureBlankFields: function(data) {
      var that = this;
      config.languages.forEach(function(lng) {

        // There should be at least one text field, so we add
        // one if there are none.
        
        if (data.altLabel[lng].length === 0 || data.altLabel[lng][data.altLabel[lng].length - 1].value !== '') {
          data.altLabel[lng].push({ value: '' });
          that.generateHints(data);
        }

        if (data.altLabel[lng].length >= 2 && data.altLabel[lng][data.altLabel[lng].length - 1].value === '' && data.altLabel[lng][data.altLabel[lng].length - 2].value === '') {
          data.altLabel[lng] = data.altLabel[lng].slice(0, data.altLabel[lng].length - 1);
        }

      });
    },

    store: function() {
      var that = this;
      that.error = '';
      that.saved = false;
      that.dirty = false;
      this.saving = true;
      Backend.putConcept(this.data).then(function(response) {
        that.saving = false;
        console.log(response);
        if (!response.data.status) {
          that.error = response.data;
          that.dirty = true;
          window.alert('Save failed, see concept for more info.');
          return;
        }
        if (response.data.status != 'success') {
          if (response.data.status == 'edit_conflict') {
            that.error = 'Redigeringskonflikt: Begrepet har blitt endret på serveren siden du begynte å redigere. Kopier ulagrede endringer og trykk så "Tilbakestill" (eller last siden på nytt) for å hente inn det oppdaterte begrepet.';
            window.alert('Redigeringskonflikt, endringene dine har ikke blitt lagret.');
          } else if (response.data.status == 'not_authenticated') {
            that.error = 'Beklager, kunne ikke lagre fordi du ikke lenger er innlogget. Prøv å laste siden på nytt for å logge inn igjen.';
            window.alert('Beklager, kunne ikke lagre fordi du ikke lenger er innlogget. Prøv å laste siden på nytt for å logge inn igjen.');
          } else if (response.data.status == 'no_permission') {
            that.error = 'Beklager, du har ikke redigeringstilgang. Hvis du nettopp har registrert deg må du vente på at kontoen blir godkjent.';
            window.alert('Beklager, du har ikke redigeringstilgang. Hvis du nettopp har registrert deg må du vente på at kontoen blir godkjent.');
          } else {
            that.error = response.data.status;
            that.dirty = true;
            window.alert('Save failed, see concept for more info.');
          }
          return;
        }
        that.saved = true;
        that.load(true);  // Reload to get term URIs etc..
        $rootScope.$broadcast('conceptSaved', that);
      }).catch(function(err) {
        that.saving = false;
        that.dirty = true;
        console.log(err);
        that.error = 'Invalid response received: ' + err.message;
        window.alert('Save failed!');
      });
    },

    load: function(force) {
      var that = this,
          deferred = $q.defer();

      if (this.data && !force) {
        $timeout(function() {
          deferred.resolve();
        }, 0);
      } else {
        this.loading = true;

        Backend.getConcept(this.uri).then(function(data) {
          that.loading = false;
          if (!data.concept) {
            if (data.error) {
              that.error = data.error;
            } else {
              that.error = data;
            }
            deferred.reject();
            return;
          }
          that.setData(data.concept);
          that.error = null;
          console.log('[Concept] Concept loaded: ' + data.concept.uri);
          console.log(that.data);

          that.recommended = that.data.libCode.map(function(k) {
            return libCodeMapping[k];
          });

          that.candidates = [];
          if (that.data.wikidataItem && that.data.wikidataItem.length) {
            that.loadCandidateByUri(that.data.wikidataItem[0], true);
          } else {
            var terms = [that.data.prefLabel.nb[0].value];
            if (that.data.prefLabel.en.length && that.data.prefLabel.en[0].value) {
              var x = that.data.prefLabel.en[0].value;
              // if (x[x.length - 1] == 's') {
              //   x = x.substr(0, x.length - 1);
              // }
              terms.push(x);
            }
            that.loadCandidate(terms);
          }


          $rootScope.$broadcast('conceptLoaded', that);
          deferred.resolve();
        }, function() {
          that.loading = false;
          that.error = 'Load failed. Server or network problems.';
          deferred.reject();
        });

      }
      return deferred.promise;
    },

    toJson: function() {
      var data = {},
          that = this;
      Object.keys(this).forEach(function(x) {
        if (x == 'originalData') return;
        data[x] = that[x];
      });
      return JSON.stringify(data);
    }

  };

  return Concept;

}]);
