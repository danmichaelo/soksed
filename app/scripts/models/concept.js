
// Declare app level module which depends on filters, and services
angular.module('app.services.concept', ['app.config', 'app.services.backend', 'app.directives.altlabels', 'app.directives.term'])

.factory('Concept', ['$q', '$rootScope', '$timeout', '$sce', 'Backend', 'config', function($q, $rootScope, $timeout, $sce, Backend, config) {
  'use strict';

  var libCodeMapping = {
    'ns': 'http://data.ub.uio.no/realfagstermer/cat_1',
    'na': 'http://data.ub.uio.no/realfagstermer/cat_2',
    'nf': 'http://data.ub.uio.no/realfagstermer/cat_3',
    'nb': 'http://data.ub.uio.no/realfagstermer/cat_4',
    'nc': 'http://data.ub.uio.no/realfagstermer/cat_5',
    'ne': 'http://data.ub.uio.no/realfagstermer/cat_6',
    'nk': 'http://data.ub.uio.no/realfagstermer/cat_7',
    'ni': 'http://data.ub.uio.no/realfagstermer/cat_8',
    'nm': 'http://data.ub.uio.no/realfagstermer/cat_9',
    'ngh': 'http://data.ub.uio.no/realfagstermer/cat_5',  // ???
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
      this.katapiUrl = 'https://app.uio.no/ub/emnesok/realfagstermer/search?term=' + this.label;
      var body = encodeURIComponent('\n\n\n\n--\nURI: ' + this.uri + '\nBruk: ' + this.katapiUrl);
      this.githubUrl = 'https://github.com/realfagstermer/realfagstermer/issues/new?title=' + subject + '&body=' + body;
    },

    setSelectedCandidate: function(idx) {
      this.selectedCandidate = (this.selectedCandidate == idx) ? -1 : idx ;
      if (this.selectedCandidate == -1) {
        this.data.wikidataItem = [];
      } else {
        this.data.wikidataItem = [this.candidates[this.selectedCandidate].uri];
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

    loadCandidateByUri: function(uri) {
      var that = this;
      that.wpWorking = true;

      Backend.getWikidata(uri).then(function(data) {
        if (data.title) {
          data.text = $sce.trustAsHtml(data.text);
          var ids = that.candidates.map(function(s){ return s.id; });
          if (ids.indexOf(data.id) == -1) {
            that.candidates.push(data);
          }
        }
        that.wpWorking = false;
        that.selectedCandidate = 0;
      }, function() {
        alert('FAIL!');
        that.wpWorking = false;
      });
    },

    loadCandidate: function(term, select, lang) {
      var that = this;
      that.wpWorking = true;

      Backend.getWikipedia(term, lang).then(function(data) {
        if (data.title) {
          data.text = $sce.trustAsHtml(data.text);
          var ids = that.candidates.map(function(s){ return s.id; });
          if (ids.indexOf(data.id) == -1) {
            that.candidates.push(data);
            if (select) {
              that.setSelectedCandidate(that.candidates.length - 1);
            }
          }
        }
        that.wpWorking = false;
      }, function() {
        alert('FAIL!');
        that.wpWorking = false;
      });
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
            that.loadCandidateByUri(that.data.wikidataItem[0]);
          } else {
            that.loadCandidate(that.data.prefLabel.nb[0].value);
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
