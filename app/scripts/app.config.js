
/**
 * Config
 */
angular.module('app.config', [])
  .constant('config', {
    views: [
      {id: 1, name: 'default', label: 'Standard'},
      {id: 2, name: 'nn', label: 'Omsetjing til nynorsk'},
    ],
    filters: [
      { value:'', label:'(intet filter)' },
      { value: 'has:unverified', label: 'Ikke korrekturlest' }, 
      { value: 'exists:prefLabel@nn', label: 'Har språk:nynorsk', graphOption: true },
      { value: '-exists:prefLabel@nn', label: 'Mangler språk:nynorsk' },
      { value: 'has:editorialNote', label: 'Har noter', graphOption: true }
     ],
    languages: ['nb', 'nn', 'en', 'la']
  });