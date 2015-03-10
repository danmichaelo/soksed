
// Declare app level module which depends on filters, and services
angular.module('app.services.concept', ['app.services.backend', 'app.directives.altlabels', 'app.directives.term'])

.factory('Concept', ['$q', '$rootScope', '$timeout', 'Backend', function($q, $rootScope, $timeout, Backend) {
  'use strict';

  function Concept(id, uri, label) {
    var that = this;
    that.dirty = false;
    that.loading = false;
    that.saving = false;
    that.saved = false;
    that.error = null;
    that.id = id;
    that.uri = uri;
    that.label = label;
    that.status = 'minimal';  // 'complete', 'saving', 'saved'
    that.data = null;
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
      Backend.config.languages.forEach(function(lng) {
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
      this.katapiUrl = 'https://katapi.biblionaut.net/documents?q=real:' + this.label;
      var body = encodeURIComponent('\n\n\n\n--\nURI: ' + this.uri + '\nBruk: ' + this.katapiUrl);
      this.githubUrl = 'https://github.com/realfagstermer/realfagstermer/issues/new?title=' + subject + '&body=' + body;
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

    /**
     * Make sure there is always one blank field at the end of the term list to add new data to
     * for each language
     */
    ensureBlankFields: function(data) {
      var that = this;
      Backend.config.languages.forEach(function(lng) {

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
            window.alert('Save failed, see concept for more info.');
          }
          return;
        }
        that.saved = true;
        that.load(true);  // Reload to get term URIs etc..
      }).catch(function(err) {
        that.saving = false;
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
        Backend.getConcept(this.uri).success(function(data) {
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
          $rootScope.$broadcast('conceptLoaded', that);
          deferred.resolve();
        }).error(function() {
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
