/* Context-only adapter. No requests, storage, random seeds, identities or impressions. */
(()=>{'use strict';class AdSource {pick(_category){throw Error('AdSource.pick must be implemented');}}
class HouseAdSource extends AdSource {constructor(ads){super();this.ads=ads;}pick(category){const ad=this.ads.find(a=>a.category===category);if(!ad)return null;return {title:ad.title,body:ad.body,url:ad.url,image:ad.image||''};}}
window.AdSource=AdSource;window.HouseAdSource=HouseAdSource;window.PlayAdSource=new HouseAdSource(window.PlayHouseAds||[]);
})();
