import{h as C,f as v,y as p,g as f,p as z,m as A,k as E}from"../chunks/lit-qtGbjGnK.esm.js";import{c as T,u as b,d as M,e as N,A as x,a as h,b as B,_ as I,i as c}from"../chunks/localize-F31ae3j6.esm.js";import{D as F,f as _,W as y,i as W,S as U}from"../chunks/routes-EdlJPTLc.esm.js";import{p as O}from"../chunks/progress-bar-Sn2QspHy.esm.js";import{p as R}from"../chunks/promo-pill-label-j0A8qZ0c.esm.js";import{_ as K}from"../chunks/loading-template-Av0IUyKF.esm.js";import{c as w,g as j,f as $}from"../chunks/events-Y8fYvSqM.esm.js";import{logger as H}from"../utils/logger.esm.js";import"../utils/network-listeners.esm.js";import{createScopedLocalStorage as q}from"../utils/local-storage.esm.js";import{getCookieValue as k}from"../utils/cookies.esm.js";import{i as G}from"../chunks/lodash-P8OIs-at.esm.js";import{c as J}from"../chunks/responsive-aWj_7ZN_.esm.js";import{B as V}from"../chunks/cart-contents-h60geKWa.esm.js";import"../chunks/beam-errors-P-Lu07Ce.esm.js";import"../chunks/vendor-jQ8cxMpw.esm.js";class Q extends C{static get styles(){return v`
      :host {
        position: relative;
      }

      .notification-blip {
        position: absolute;
        top: -12px;
        right: -4px;
        background-color: var(--beam-notificationBlip-color-background, #000);
        border-radius: 50%;
        width: 12px;
        height: 12px;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 12px;
      }
    `}render(){return p`<div class="notification-blip-container" aria-label="Notification Blip">
      <span class="notification-blip" role="button" tabindex="0" aria-hidden="true"></span>
    </div>`}}customElements.get("beam-notification-blip")||customElements.define("beam-notification-blip",Q);const X={"--beam-notificationBlip-color-background":"#000"},d={en:{beamAttribution:()=>"Powered by Beam",ctaTitle:()=>"Choose your impact",ctaPromoPrefixMessage:()=>"At no extra cost,",ctaPromoMessage:({donationPercentage:n="1"}={})=>`select a nonprofit and ${n}% of your purchase will be donated.`,ctaMessage:({donationPercentage:n="1"}={})=>`Select a nonprofit and ${n}% of your purchase will be donated, at no extra cost.`,inlineSeparator:()=>": "},fr:{beamAttribution:()=>"Optimis\xE9 par Beam",ctaTitle:()=>"Choisissez votre cause",ctaPromoPrefixMessage:()=>"",ctaPromoMessage:()=>"",ctaMessage:({donationPercentage:n="1"}={})=>`Choisissez un organisme \xE0 but non lucratif et ${n} % lui sera vers\xE9 en votre nom, sans frais suppl\xE9mentaires.`,inlineSeparator:()=>" : "},de:{beamAttribution:()=>"Unterst\xFCtzt von Beam",ctaTitle:()=>"W\xE4hle deinen Impact",ctaPromoPrefixMessage:()=>"",ctaPromoMessage:()=>"",ctaMessage:({donationPercentage:n="1"}={})=>`W\xE4hle eine der gemeinn\xFCtzigen Organisationen und spende ${n}% deines Einkaufs ohne zus\xE4tzliche Kosten`,inlineSeparator:()=>": "},es:{beamAttribution:()=>"Ofrecido por Beam",ctaTitle:()=>"Elige tu contribuci\xF3n",ctaPromoPrefixMessage:()=>"",ctaPromoMessage:()=>"",ctaMessage:({donationPercentage:n="1"}={})=>`Elige una organizaci\xF3n sin fines de lucro y donaremos ${n}% de tu compra sin coste adicional.`,inlineSeparator:()=>": "},it:{beamAttribution:()=>"Gestito da Beam",ctaTitle:()=>"Scegli dove fare la differenza",ctaPromoPrefixMessage:()=>"",ctaPromoMessage:()=>"",ctaMessage:({donationPercentage:n="1"}={})=>`Seleziona un'organizzazione no-profit a cui devolvere l\u2019${n}% del tuo acquisto, senza costi aggiuntivi`,inlineSeparator:()=>": "},pl:{beamAttribution:()=>"Wspierany przez Beam",ctaTitle:()=>"Wybierz inicjatyw\u0119, kt\xF3r\u0105 chcesz wesprze\u0107",ctaPromoPrefixMessage:()=>"",ctaPromoMessage:()=>"",ctaMessage:({donationPercentage:n="1"}={})=>`Wybierz organizacj\u0119, kt\xF3rej przeka\u017Cesz ${n}% warto\u015Bci Twoich zakup\xF3w \u2013 bez \u017Cadnych dodatkowych koszt\xF3w!`,inlineSeparator:()=>": "}};var Y=Object.defineProperty,Z=Object.getOwnPropertyDescriptor,m=(n,t,e,i)=>{for(var o=i>1?void 0:i?Z(t,e):t,a=n.length-1,r;a>=0;a--)(r=n[a])&&(o=(i?r(t,e,o):r(o))||o);return i&&o&&Y(t,e,o),o};class l extends C{constructor(){super(...arguments),this.baseUrl=F,this.selectedNonprofitId=null,this.lang="en",this.debug=!1,this.enableNonprofitDeselection=!1,this.didTryToCreateNewSelectionFromCache=!1,this.getChainNonprofits=async()=>{N(["apiKey"],this);const t=this.cart?.content?{schema:this.cart?.schema,content:this.cart?.content}:void 0,e=await _({baseUrl:this.baseUrl,apiRoot:"/api/v3",headers:{authorization:`Api-Key ${this.apiKey}`},requestBody:{storeId:this.storeId,widgetName:y.select_nonprofit,postalCode:this.postalCode,countryCode:this.countryCode,version:"1.0.0",lang:this.configLang,cart:t}});return this.enableNonprofitDeselection=!!e.config.enableNonprofitDeselection,this.selectedNonprofitId!==null&&this.selectedNonprofitId&&!e.nonprofits.map(i=>i.nonprofit.id).includes(this.selectedNonprofitId)&&(this.selectedNonprofitId=null,await this.postSelectNonprofit({selectedNonprofitId:null}),this.localStorage.setItem("nonprofit",null)),e.store?.id&&e.store.id!==this.storeId&&(this.storeId=e.store.id),await this.createNewSelectionForCachedNonprofit(),this.localStorage.setItemJson("chainNonprofits",{createdAt:new Date,data:e}),e},this.postSelectNonprofit=async({selectedNonprofitId:t})=>{N(["apiKey","storeId"],this);const e=this.getExternalCartId(),i=this.getBeamCartId(),o=await W({baseUrl:this.baseUrl,headers:{authorization:`Api-Key ${this.apiKey}`},requestBody:{nonprofitId:t,selectionId:this.selectionId,storeId:this.storeId,cartId:e,beamCartId:i,postalCode:this.postalCode,countryCode:this.countryCode}});this.selectionId=o?.selectionId,this.localStorage.setItem("transaction",this.selectionId),this.localStorage.setItem("nonprofit",t),this.localStorage.setItem("nonprofit_selected_at",new Date().toISOString()),await this.updateComplete;const a=this.getNonprofitById(t);t!==null&&this.dispatchEvent(new w({selectedNonprofitId:t,selectionId:this.selectionId,nonprofitName:a?.nonprofit?.name??null,source:y.select_nonprofit})),t&&t!==null&&new j({newNonprofitId:null,selectionId:this.selectionId})},this.nonprofitListDataController=new x(this,this.getChainNonprofits),this.selectionDataController=new x(this,this.postSelectNonprofit),this.localStorage=q(this),this.handleCartChange=t=>{this.cart=t.detail},this.makeHandleSelect=(t,e,i)=>async o=>{const a=this.selectedNonprofitId;if(o instanceof KeyboardEvent){let r=null;switch(o.key){case"ArrowUp":case"ArrowLeft":e===0?r=i[i.length-1]:r=i[e-1],o.preventDefault();break;case"ArrowRight":case"ArrowDown":e===i.length-1?r=i[0]:r=i[e+1],o.preventDefault();break;case"Enter":case" ":o.preventDefault();break;default:return}if(r){a!=null&&(this.selectedNonprofitId=r.nonprofit.id);const g=this.renderRoot.querySelector(`[data-value="${r.nonprofit.id}"]`);g!==null&&(g.tabIndex=0,g.focus());return}}if(o.currentTarget instanceof HTMLElement)if(a===t)if(this.enableNonprofitDeselection)this.selectedNonprofitId=null,await this.postSelectNonprofit({selectedNonprofitId:null}),this.localStorage.setItem("nonprofit",null);else return;else this.selectedNonprofitId=t;await this.selectionDataController.exec({selectedNonprofitId:this.selectedNonprofitId})}}get configLang(){return U[this.lang]||"en"}getNonprofitById(t){return t?this.nonprofitListDataController?.data?.nonprofits.find(e=>e.nonprofit.id===t):null}connectedCallback(){super.connectedCallback(),window.addEventListener($.eventName,this.handleCartChange)}async firstUpdated(t){await this.restoreStateFromCache()}async updated(t){const e=["baseUrl","storeId","apiKey","countryCode","postalCode","cart","lang"];for(const i of e)if(t.has(i)){await this.nonprofitListDataController.exec();break}}disconnectedCallback(){window.removeEventListener($.eventName,this.handleCartChange),super.disconnectedCallback()}getExternalCartId(){return this.localStorage.getItemJson("cart")?.cartId??k("cart")}getBeamCartId(){return k(V)}async restoreStateFromCache(){try{const t=new Date().valueOf();this.cart=this.localStorage.getItemJson("cart")??void 0;const e=30*24*60*60*1e3,i=this.localStorage.getItem("nonprofit_selected_at")??0,o=t>new Date(i).valueOf()+e;o?o&&this.selectedNonprofitId!==null&&(await this.postSelectNonprofit({selectedNonprofitId:null}),this.localStorage.setItem("nonprofit",null)):(this.selectedNonprofitId=parseInt(this.localStorage.getItem("nonprofit")||"")||null,this.selectionId=this.localStorage.getItem("transaction")??void 0);const{createdAt:a=0,data:r}=this.localStorage.getItemJson("chainNonprofits")||{},g=2*60*60*1e3;t>new Date(a).valueOf()+g||(this.nonprofitListDataController.data=r,this.nonprofitListDataController.loading=!1)}catch(t){H.error(t)}}async createNewSelectionForCachedNonprofit(){if(N(["apiKey"],this),!(!this.storeId||this.didTryToCreateNewSelectionFromCache))try{if(this.didTryToCreateNewSelectionFromCache=!0,this.selectedNonprofitId){this.selectionId||await this.selectionDataController.exec({selectedNonprofitId:this.selectedNonprofitId});const t=this.getNonprofitById(this.selectedNonprofitId);this.dispatchEvent(new w({selectedNonprofitId:this.selectedNonprofitId,selectionId:this.selectionId,nonprofitName:t?.nonprofit?.name,source:y.select_nonprofit}))}}catch{}}get cssVariables(){const t={"--beam-fontFamily":"inherit","--beam-fontStyle":"inherit","--beam-fontSize":"inherit","--beam-textColor":"inherit","--beam-backgroundColor":"inherit",...O,"--beam-SelectNonprofit-title-textAlign":"inherit","--beam-SelectNonprofit-description-textAlign":"inherit","--beam-SelectNonprofit-maxWidth":"800px","--beam-SelectNonprofit-options-marginTop":"0px","--beam-SelectNonprofit-options-iconHeight":"24px","--beam-SelectNonprofit-options-padding":"10px","--beam-SelectNonprofit-options-borderRadius":"0px","--beam-SelectNonprofit-options-borderColor":"currentColor","--beam-SelectNonprofit-options--selected-borderColor":"currentColor","--beam-SelectNonprofit-options-backgroundColor":"transparent","--beam-SelectNonprofit-options-gap":"8px","--beam-SelectNonprofit-options--selected-backgroundColor":"currentColor","--beam-SelectNonprofit-details-marginTop":"10px","--beam-SelectNonprofit-details-borderRadius":"0px","--beam-SelectNonprofit-details-borderColor":"currentColor","--beam-SelectNonprofit-details-backgroundColor":"inherit",...h("--beam-SelectNonprofit-title",{fontSize:"1.25em",fontWeight:"bold"}),"--beam-SelectNonprofit-header-inline-lineHeight":"inherit",...h("--beam-SelectNonprofit-title-inline",{fontWeight:"bold"}),"--beam-SelectNonprofit-title-inline-textTransform":"none","--beam-SelectNonprofit-title-block-margin-right":"8px",...h("--beam-SelectNonprofit-description",{marginTop:"0.5em"}),...h("--beam-SelectNonprofit-description-inline"),...h("--beam-SelectNonprofit-details-cause",{fontSize:"0.85em",fontWeight:"bold"}),...h("--beam-SelectNonprofit-details-beamAttribution",{fontSize:"0.85em"}),...h("--beam-SelectNonprofit-details-impactDescription",{fontSize:"1em",marginTop:"10px"}),"--beam-SelectNonprofit-details-nonprofitName-fontWeight":"bold","--beam-SelectNonprofit-details-nonprofitName-fontStyle":"inherit","--beam-SelectNonprofit-details-fundingProgress-marginTop":"10px",...h("--beam-SelectNonprofit-details-fundingProgressLabel",{fontSize:"0.85em"}),...X,...R},e=this.nonprofitListDataController?.data?.config?.web?.theme||{},i={...t,...e};return Object.assign(Object.create({toCSS(){return B(this)}}),i)}render(){const{selectedNonprofitId:t}=this,{data:e,loading:i}=this.nonprofitListDataController;if(i&&!e)return K();if(this.nonprofitListDataController.error)return this.debug?I({error:this.nonprofitListDataController.error}):"";if(this.selectionDataController.error&&this.debug)return I({error:this.selectionDataController.error});const o=e?.nonprofits||[],a=o.find(s=>s.nonprofit.id===t)||null,r=e?.config?.web?.promo,g=o.some(s=>!s.promo||!s.promo.isActive);return p`
      <style>
        :host {
          ${this.cssVariables.toCSS()}
        }
      </style>
      <div part="heading">
        <div class="block-header-promo-pill-container">
          <h3 class="title-block d-none d-lg-block" part="title" id="beam-SelectNonprofit-title">
            ${c(this.configLang,e?.config?.web?.title||"")||d[this.configLang].ctaTitle()}
          </h3>
          <beam-promo-info-pill .promo=${e?.config?.web?.promo}></beam-promo-info-pill>
        </div>
        <p class="description" part="description">
          <span class="d-none d-lg-inline">
          ${r?p`<span style="font-weight:bold">
                    ${c(this.configLang,e?.config?.web?.promoDescriptionPrefix||"")||d[this.configLang].ctaPromoPrefixMessage()}
                  </span>
                  <span>
                    ${c(this.configLang,e?.config?.web?.promoDescription||"")||d[this.configLang].ctaPromoMessage()}
                  </span>`:p`<span>
                  ${c(this.configLang,e?.config?.web?.description||"")||d[this.configLang].ctaMessage()}
                </span>`}
          </span>
          <div class="d-lg-none header-inline">
            <span class="title-inline" part="title">
              ${(c(this.configLang,e?.config?.web?.title||"")||d[this.configLang].ctaTitle())+d[this.configLang].inlineSeparator()}
            </span>
            <span class="description-inline" part="description">
            ${r?p`<span style="font-weight:bold">
                      ${c(this.configLang,e?.config?.web?.promoDescriptionPrefix||"")||d[this.configLang].ctaPromoPrefixMessage()}
                    </span>
                    <span>
                      ${c(this.configLang,e?.config?.web?.promoDescription||"")||d[this.configLang].ctaPromoMessage()}
                    </span>`:p`<span
                    >${c(this.configLang,e?.config?.web?.description||"")||d[this.configLang].ctaMessage()}
                  </span>`}
          </div>
        </p>
      </div>
      <div
        class="options"
        part="options"
        role="radiogroup"
        aria-labelledby="beam-SelectNonprofit-title"
        style="display: flex; gap: var(--beam-SelectNonprofit-options-gap); margin: 10px 0 0 0;"
      >
        ${z(o,s=>s.nonprofit.id,({nonprofit:s,promo:P},S)=>{const u=t===s.id,D=u||a==null&&S===0,L=P?.isActive&&e?.config.web.promo&&g;return p`
              <div
                class="option"
                part="option"
                role="radio"
                tabindex="${D?0:-1}"
                data-value=${s.id}
                aria-checked=${u}
                @click=${this.makeHandleSelect(s.id,S,o)}
                @keydown=${this.makeHandleSelect(s.id,S,o)}
                aria-label="${c(this.configLang,s.cause||"")}"
                style="${A({cursor:"pointer",flex:"1",textAlign:"center",lineHeight:"1",marginTop:"var(--beam-SelectNonprofit-options-marginTop, 0px)",padding:"var(--beam-SelectNonprofit-options-padding, 10px)",borderWidth:"var(--beam-SelectNonprofit-options-borderWidth, 1px)",borderStyle:"solid",borderRadius:"var(--beam-SelectNonprofit-options-borderRadius, 0)",borderColor:u?s.causeColor||"var(--beam-SelectNonprofit-options--selected-borderColor, currentColor)":"var(--beam-SelectNonprofit-options-borderColor, currentColor)",backgroundColor:u?s.causeColor||"var(--beam-SelectNonprofit-options--selected-backgroundColor, currentColor)":"var(--beam-SelectNonprofit-options-backgroundColor, transparent)"})}"
              >
                <img
                  src="${u?s.causeIconSelectedUrl:s.causeIconUrl}"
                  alt=""
                  role="presentation"
                  style="
                        height: var(--beam-SelectNonprofit-options-iconHeight, 24px);
                        user-select: none;
                    "
                />
                ${L?p`<beam-notification-blip></beam-notification-blip>`:p``}
              </div>
            `})}
      </div>
      ${a!=null?p`
              <div
                class="details"
                part="details"
                style="
                  border: 1px solid var(--beam-SelectNonprofit-details-borderColor);
                  border-radius: var(--beam-SelectNonprofit-details-borderRadius);
                  background-color: var(--beam-SelectNonprofit-details-backgroundColor);
                  padding: 10px;
                  margin-top: var(--beam-SelectNonprofit-details-marginTop)
                 "
              >
                <div
                  style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap-reverse"
                >
                  <span
                    class="details-cause"
                    style="flex: 0 1; white-space: nowrap; ${b("--beam-SelectNonprofit-details-cause")}"
                  >
                    ${a?.promo?.isActive&&g?e?.config.web.promo?.["promo-cause-alt-text"]||a.nonprofit.cause:c(this.configLang,a.nonprofit.cause||"")}
                  </span>
                  <span
                    class="details-beamAttribution"
                    style="flex: 0 1; white-space: nowrap; ${b("--beam-SelectNonprofit-details-beamAttribution")}"
                  >
                    ${d[this.configLang].beamAttribution()}
                  </span>
                </div>
                <p class="details-impactDescription">
                  ${E(c(this.configLang,a.impact.description||""))}
                </p>
                <div
                  style="display: flex; margin-top: var(--beam-SelectNonprofit-details-fundingProgress-marginTop); align-items: center;"
                >
                  <beam-progress-bar
                    value="${a.impact.goalProgressPercentage}"
                    style="flex: 1 0;"
                  ></beam-progress-bar>
                  <span
                    class="details-fundingProgressLabel"
                    style="${b("--beam-SelectNonprofit-details-fundingProgressLabel")} white-space: nowrap; text-align: right; flex: 0 1; margin-left: 15px;"
                  >
                    ${c(this.configLang,a.impact.goalProgressText)}
                  </span>
                </div>
              </div>
            `:""}
    `}}l.tagName="beam-select-nonprofit",l.styles=[T,J,v`
      :host {
        display: block;
        max-width: var(--beam-SelectNonprofit-maxWidth, 800px);
        font-family: var(--beam-fontFamily);
        font-style: var(--beam-fontStyle);
        font-size: var(--beam-fontSize);
        background-color: var(--beam-backgroundColor);
        color: var(--beam-textColor);
        word-break: normal;
      }

      .details-impactDescription {
        ${b("--beam-SelectNonprofit-details-impactDescription")}
      }

      .details-impactDescription .nonprofitName {
        font-weight: var(--beam-SelectNonprofit-details-nonprofitName-fontWeight);
        font-style: var(--beam-SelectNonprofit-details-nonprofitName-fontStyle, inherit);
      }

      /* Note: title/description display is responsive */

      .title-block {
        margin-right: var(--beam-SelectNonprofit-title-block-margin-right);
        ${b("--beam-SelectNonprofit-title")}
        text-align: var(--beam-SelectNonprofit-title-textAlign);
      }

      .header-inline {
        line-height: var(--beam-SelectNonprofit-header-inline-lineHeight);
      }

      .title-inline {
        font-size: var(--beam-SelectNonprofit-title-inline-fontSize);
        font-weight: var(--beam-SelectNonprofit-title-inline-fontWeight);
        color: var(--beam-SelectNonprofit-title-inline-color);
        font-family: var(--beam-SelectNonprofit-title-inline-fontFamily);
        text-transform: var(--beam-SelectNonprofit-title-inline-textTransform);
      }

      .description-inline {
        font-family: var(--beam-SelectNonprofit-description-inline-fontFamily);
        font-weight: var(--beam-SelectNonprofit-description-inline-fontWeight);
        color: var(--beam-SelectNonprofit-description-inline-color);
        text-transform: var(--beam-SelectNonprofit-description-inline-textTransform);
        font-size: var(--beam-SelectNonprofit-description-inline-fontSize);
      }

      .description {
        ${b("--beam-SelectNonprofit-description")}
        text-align: var(--beam-SelectNonprofit-description-textAlign);
      }

      .block-header-promo-pill-container {
        display: flex;
        align-items: center;
      }
    `],m([f({type:String})],l.prototype,"baseUrl",2),m([f({type:String})],l.prototype,"apiKey",2),m([f({type:Number,reflect:!0})],l.prototype,"storeId",2),m([f({type:String})],l.prototype,"countryCode",2),m([f({type:String})],l.prototype,"postalCode",2),m([f({attribute:!1,hasChanged:(n,t)=>!G(n,t)})],l.prototype,"cart",2),m([f({type:Number,reflect:!0})],l.prototype,"selectedNonprofitId",2),m([f({type:String})],l.prototype,"lang",2),m([f({type:Boolean})],l.prototype,"debug",2),M(l);export{l as BeamSelectNonprofit};
//# sourceMappingURL=select-nonprofit.esm.js.map
