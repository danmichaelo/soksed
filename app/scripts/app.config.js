
/**
 * Config
 */
angular.module('app.config', [])
  .constant('config', {
    views: [
      {id: 1, name: 'default', label: 'Standard'},
      {id: 2, name: 'nn', label: 'Omsetjing til nynorsk'},
      {id: 3, name: 'mapping', label: 'Engelsk + kategorisering + Wikidata'},
      {id: 4, name: 'se', label: 'Oversetting til nordsamisk'},
    ],
    filters: [
      { value:'', label:'(intet filter)' },
      { value: 'has:unverified', label: 'Ikke korrekturlest' },
      { value: 'exists:prefLabel@nn', label: 'Har språk:nynorsk', graphOption: true },
      { value: '-exists:prefLabel@nn', label: 'Mangler språk:nynorsk' },
      { value: 'exists:prefLabel@en', label: 'Har språk:engelsk', graphOption: true },
      { value: '-exists:prefLabel@en', label: 'Mangler språk:engelsk' },
      { value: 'exists:prefLabel@la,-exists:prefLabel@en', label: 'Har latin, mangler engelsk', graphOption: true },
      { value: 'has:editorialNote', label: 'Har noter', graphOption: true },
      { value: 'has:wikidataItem', label: 'Har wikidata-mapping', graphOption: true },
    ],
    sortOptions: [
      { value: 'label:asc', label: 'A-Å' },
      { value: 'label:desc', label: 'Å-A' },
      { value: 'modified:asc', label: 'eldste' },
      { value: 'modified:desc', label: 'nyeste (sist endret)' },
      { value: 'upstream:asc', label: 'eldste oppstrøms' },
      { value: 'upstream:desc', label: 'nyeste oppstrøms (sist endret)' },
    ],
    languages: ['nb', 'nn', 'en', 'la', 'se']
  });
