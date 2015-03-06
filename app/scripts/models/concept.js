
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
      if (!data.altLabel || !Object.keys(data.altLabel).length) data.altLabel = {};
      Backend.config.languages.forEach(function(lng) {
        // There should be at least one text field, so we add
        // one if there are none.
        if (!data.prefLabel[lng]) data.prefLabel[lng] = [{ value: '' }];
        if (!data.altLabel[lng]) data.altLabel[lng] = [{ value: '' }];
      });

      // DUMMY:
      data.prefLabel.nn[0].hints = [];
      data.prefLabel.nn[0].hints.push(data.prefLabel.nb[0].value);
      var m = data.prefLabel.nb[0].value.match('^(.*)er$');
      if (m) {
        data.prefLabel.nn[0].hints.push(m[1] + 'ar');
      }

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
    },

    markReviewed: function(uri) {
      var that = this;
      console.log('Mark as reviewed: ' + uri);
      Backend.markReviewed(uri).then(function(response) {
        that.load(true);  // Reload to get term URIs etc..
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
          alert('Save failed, see concept for more info.');
          return;
        }
        if (response.data.status != 'success') {
          if (response.data.status == 'edit_conflict') {
            that.error = 'Redigeringskonflikt: Begrepet har blitt endret på serveren siden du begynte å redigere. Kopier ulagrede endringer og trykk så "Tilbakestill" (eller last siden på nytt) for å hente inn det oppdaterte begrepet.';
            alert('Redigeringskonflikt, endringene dine har ikke blitt lagret.');
          } else if (response.data.status == 'no_permission') {
            that.error = 'Beklager, du har ikke redigeringstilgang. Hvis du nettopp har registrert deg må du vente på at kontoen blir godkjent.';
            alert('Beklager, du har ikke redigeringstilgang. Hvis du nettopp har registrert deg må du vente på at kontoen blir godkjent.');
          } else {
            that.error = response.data.status;
            alert('Save failed, see concept for more info.');
          }
          return;
        }
        that.saved = true;
        that.load(true);  // Reload to get term URIs etc..
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
