import{f as x,g,t as I,h as v,y as p,k as b,m as u}from"../chunks/lit-yVXn5Cbs.esm.js";import{p as $}from"../chunks/progress-bar-7gWYaGlq.esm.js";import{partnerLogosConfigDefaults as T}from"./beam-partner-logos.js";import{c as k,d as w,e as S,A,_ as C,a as L}from"../chunks/enforce-config-fo8kIfoY.esm.js";import{D as z,g as F,S as D}from"../chunks/routes-1-1FXngS.esm.js";import{u as n,i as c,_ as M,d as m}from"../chunks/localize-pzAAkBvG.esm.js";import{B as U}from"../chunks/beam-errors-P-Lu07Ce.esm.js";import{c as f}from"../chunks/css-card-grid-3b56QBzq.esm.js";import"../utils/logger.js";const y={en:{fundedTimes:({times:i=0})=>`Funded <b>${i}</b> ${i>1?"times":"time"} so far`,learnMore:()=>"Learn more",seeAll:()=>"See All"},fr:{fundedTimes:({times:i=0})=>`Financ\xE9 <b>${i}</b> fois pour l'instant`,learnMore:()=>"En savoir plus",seeAll:()=>"Voir tout"},de:{fundedTimes:({times:i=0})=>`<b>${i}</b> Mal finanziert`,learnMore:()=>"Mehr erfahren",seeAll:()=>"Alle anzeigen"},es:{fundedTimes:({times:i=0})=>`Financiado <b>${i}</b> ${i>1?"vez":"veces"}`,learnMore:()=>"Saber m\xE1s",seeAll:()=>"Ver Todo"},it:{fundedTimes:({times:i=0})=>`Finanziato <b>${i}</b> ${i>1?"volta":"volte"}`,learnMore:()=>"Scopri di pi\xF9",seeAll:()=>"Vedi Tutto"},pl:{fundedTimes:({times:i=0})=>`Udzielono wsparcia <b>${i}</b> ${i>1?"razy":"raz"}`,learnMore:()=>"Dowiedz si\u0119 wi\u0119cej",seeAll:()=>"Zobacz wszystko"}};var E=Object.defineProperty,P=Object.getOwnPropertyDescriptor,d=(i,a,t,r)=>{for(var o=r>1?void 0:r?P(a,t):a,e=i.length-1,l;e>=0;e--)(l=i[e])&&(o=(r?l(a,t,o):l(o))||o);return r&&o&&E(a,t,o),o};class s extends v{constructor(){super(...arguments),this.baseUrl=z,this.cardStyle="image",this.lang="en",this.debug=!1,this.selectedFilter=null,this.getImpactData=async()=>(S(["apiKey","chainId"],this),F({baseUrl:this.baseUrl,headers:{authorization:`Api-Key ${this.apiKey}`},queryParams:{chainId:this.chainId,personalImpactLimit:0,widgetName:"community-impact",version:"1.0.0",lang:this.configLang}})),this.impactDataController=new A(this,this.getImpactData),this.renderImageCard=a=>p`
      <div class="image-card" part="nonprofit-card" style="display: flex; flex-direction: column;">
        <div class="image-card-image-box" style="background-image: url('${a.imageUrl}');">
          <p class="image-card-cause">${c(this.configLang,a.nonprofit?.cause||"")}</p>
          <h4 class="image-card-name">${c(this.configLang,a.nonprofit?.name)}</h4>
        </div>
        <div
          style="padding: 5px 15px 15px; flex: 1 1 auto; border-radius: 0px; border: none; display: flex; flex-direction: column;"
        >
          <div class="image-card-progress" style="display: flex; align-items: center;">
            <beam-progress-bar style="flex-grow: 1;" value="${a.impact?.goalProgressPercentage}"></beam-progress-bar>
            <span class="image-card-progressText" style="margin-left: 20px;"
              >${c(this.configLang,a.impact?.goalProgressText)}</span
            >
          </div>
          <div class="image-card-description">
            ${b(c(this.configLang,a.impact?.description||""))}
          </div>
          <div style="display: flex; align-items: end; flex-wrap: wrap; gap: 10px; flex: 1;" class="image-card-footer">
            <div class="image-card-goal-completion" style="flex-grow: 1;">
              ${b(c(this.configLang,a.impact?.goalCompletionText))}
            </div>
            <a
              href="${a.nonprofit?.website}"
              target="_blank"
              class="image-card-link"
              style="color: var(--beam-CommunityImpact-imageCard-link-color, inherit); white-space: nowrap"
            >
              ${c(this.configLang,a.nonprofit?.websiteLinkText)}<span class="image-card-link-arrow"
                >&nbsp;&rsaquo;</span
              >
            </a>
          </div>
        </div>
      </div>
    `,this.renderIconCard=a=>p`
      <div class="icon-card" part="nonprofit-card" style="display: flex; flex-direction: column;">
        <img class="icon-card-icon" src="${a.nonprofit?.causeIconUrl}" alt="${a.nonprofit?.cause}" />
        <p class="icon-card-cause">${a.nonprofit?.cause}</p>
        <h4 class="icon-card-name">${a.nonprofit?.name}</h4>
        <div class="icon-card-description" part="nonprofit-card-description" style="flex: 1;">
          ${b(c(this.configLang,a.impact?.description||""))}
        </div>
        <div class="icon-card-footer" style="width: 100%; text-align: center;">
          <div class="icon-card-progress" style="display: flex; align-items: center; width: 100%;">
            <beam-progress-bar style="flex: 1 0;" value="${a.impact?.goalProgressPercentage}"></beam-progress-bar>
            <span style="text-align: right; flex: 0 1; white-space: nowrap" class="icon-card-progressText"
              >${c(this.configLang,a.impact?.goalProgressText)}</span
            >
          </div>
          <div class="icon-card-goal-completion">
            ${b(c(this.configLang,a.impact?.goalCompletionText))}
          </div>
          <a
            href="${a.nonprofit?.website}"
            target="_blank"
            class="icon-card-link"
            style="color: var(--beam-CommunityImpact-iconCard-link-color, inherit); display: block"
            >${c(this.configLang,a.nonprofit?.websiteLinkText)||y[this.configLang].learnMore()}<span class="icon-card-link-arrow">&nbsp;&rsaquo;</span>
          </a>
          ${a.impact?.goalCompletionText===""?p`<div class="icon-card-goal-completion">&nbsp;</div>`:""}
        </div>
      </div>
    `,this.renderCards=({nonprofits:a})=>p`
      <div class="beam-nonprofit-${this.cardStyle}-cards" part="nonprofit-cards">
        ${a?.map(this.cardStyle==="image"?this.renderImageCard:this.renderIconCard)}
      </div>
    `}get configLang(){return D[this.lang]||"en"}async updated(a){const t=["chainId","baseUrl","lang"];for(const r of t)if(a.has(r)){this.impactDataController.exec();break}}renderFilterTabs({nonprofits:a}){const t=Array.from(new Set(a.flatMap(e=>e.filters||[])));if(t.length===0)return"";const r=()=>{this.selectedFilter=null},o=e=>{this.selectedFilter===e?this.selectedFilter=null:this.selectedFilter=e};return p` <div
      class="beam-filter-tabs"
      part="filters"
      style="display: inline-flex; flex-wrap: wrap; gap: 0.5em 1em"
    >
      <span
        tabindex="0"
        style="${u({"padding-bottom":"1px","border-bottom-width":"2px","border-bottom-style":"solid","border-bottom-color":this.selectedFilter===null?"currentColor":"transparent"})}"
        @click=${r}
        @keydown=${e=>{["Enter"," "].includes(e.key)&&(e.preventDefault(),r())}}
        >${y[this.configLang].seeAll()}</span
      >
      ${t.map(e=>p`<span
            tabindex="0"
            @click=${()=>o(e)}
            @keydown=${l=>{["Enter"," "].includes(l.key)&&(l.preventDefault(),o(e))}}
            style="${u({"padding-bottom":"1px","border-bottom-width":"2px","border-bottom-style":"solid","border-bottom-color":this.selectedFilter===e?"currentColor":"transparent"})}"
            >${e}</span
          >`)}
    </div>`}render(){const{selectedFilter:a}=this,{data:t,error:r,loading:o}=this.impactDataController;if(o)return M();if(r)return this.debug?C({error:r}):"";if(t==null)return this.debug?C({error:new U("Missing data")}):"";const{community:e}=t,l=a?e.filter(h=>h.filters?.includes(a)):e;return p`
      <style>
        :host {
          ${this.cssVariables.toCSS()}
        }
      </style>
      <beam-partner-logos
        part="logos"
        partnerLogoUrl="${t.chain.logoUrl}"
        partnerName="${t.chain.name}"
      ></beam-partner-logos>

      ${this.renderFilterTabs({nonprofits:e})} ${this.renderCards({nonprofits:l})}
    `}get cssVariables(){const a={"--beam-fontFamily":"inherit","--beam-fontStyle":"inherit","--beam-fontSize":"14px","--beam-lineHeight":"1","--beam-textColor":"inherit","--beam-backgroundColor":"inherit",...T,...$,"--beam-CommunityImpact-filterTabs-textalign":"left","--beam-CommunityImpact-filterTabs-marginBottom":"20px","--beam-CommunityImpact-imageCard-borderColor":"currentColor","--beam-CommunityImpact-imageCard-borderRadius":"0","--beam-CommunityImpact-imageCard-borderWidth":"1px","--beam-CommunityImpact-imageCard-backgroundColor":"inherit","--beam-CommunityImpact-imageCard-foregroundColor":"inherit",...m("--beam-CommunityImpact-filterTabs",{fontSize:"16px",marginTop:"10px",fontWeight:"bold"}),...m("--beam-CommunityImpact-imageCard-cause",{fontSize:"14px",textTransform:"uppercase",color:"#fff"}),...m("--beam-CommunityImpact-imageCard-name",{fontSize:"22px",marginTop:"0",color:"#fff"}),...m("--beam-CommunityImpact-imageCard-description",{marginTop:"10px",lineHeight:"1.3"}),"--beam-CommunityImpact-imageCard-link-color":"inherit","--beam-CommunityImpact-imageCard-linkArrow-display":"none",...m("--beam-CommunityImpact-imageCard-link",{fontSize:"12px"}),...m("--beam-CommunityImpact-imageCard-goalCompletion",{fontSize:"12px"}),"--beam-CommunityImpact-imageCard-goalCompletion-fontStyle":"italic","--beam-CommunityImpact-imageCard-progress-marginTop":"10px",...m("--beam-CommunityImpact-imageCard-progressText"),"--beam-CommunityImpact-imageCard-footer-marginTop":"10px",...m("--beam-CommunityImpact-iconCard-cause",{marginTop:"10px"}),...m("--beam-CommunityImpact-iconCard-name",{marginTop:"5px",fontWeight:"bold"}),"--beam-CommunityImpact-iconCard-progress-marginTop":"10px",...m("--beam-CommunityImpact-iconCard-progressText"),...m("--beam-CommunityImpact-iconCard-description",{marginTop:"10px",lineHeight:"1.3"}),"--beam-CommunityImpact-iconCard-description-textAlign":"left",...m("--beam-CommunityImpact-iconCard-goalCompletion",{marginTop:"10px"}),"--beam-CommunityImpact-iconCard-link-color":"inherit","--beam-CommunityImpact-iconCard-linkArrow-display":"none",...m("--beam-CommunityImpact-iconCard-link",{marginTop:"5px"})},t=(this.impactDataController.data?.community.length||0)===3?3:this.cardStyle==="icon"?4:2;a["--beam-CommunityImpact-columns"]=t.toString(),a["--beam-CommunityImpact-columns-minWidth"]=this.cardStyle==="image"?"300px":"200px";const r=this.impactDataController?.data?.config?.web?.theme||{},o={...a,...r};return Object.assign(Object.create({toCSS(){return L(this)}}),o)}}s.tagName="beam-community-impact",s.styles=[k,x`
      :host {
        display: block;
        font-family: var(--beam-fontFamily, inherit);
        font-style: var(--beam-fontStyle, inherit);
        font-size: var(--beam-fontSize, inherit);
        color: var(--beam-textColor, inherit);
        background-color: var(--beam-backgroundColor, inherit);
        line-height: var(--beam-lineHeight, 1);
        word-break: normal;
      }

      .beam-filter-tabs {
        ${n("--beam-CommunityImpact-filterTabs")}
        margin-bottom: var(--beam-CommunityImpact-filterTabs-marginBottom, 10px);
        text-align: var(--beam-CommunityImpact-filterTabs-textalign, left);
      }

      .beam-nonprofit-image-cards,
      .beam-nonprofit-icon-cards {
        margin-top: 10px;
      }

      ${f({gap:"20px",className:"beam-nonprofit-image-cards",columnCount:"var(--beam-CommunityImpact-columns)",itemMinWidth:"var(--beam-CommunityImpact-columns-minWidth)"})}

      ${f({gap:"40px",className:"beam-nonprofit-icon-cards",columnCount:"var(--beam-CommunityImpact-columns)",itemMinWidth:"var(--beam-CommunityImpact-columns-minWidth)"})}

      /* Image Style Cards */

      .image-card {
        overflow-wrap: break-word;
        border-color: var(--beam-CommunityImpact-imageCard-borderColor);
        border-style: solid;
        border-width: var(--beam-CommunityImpact-imageCard-borderWidth);
        border-radius: var(--beam-CommunityImpact-imageCard-borderRadius);
        overflow: hidden;
        background-color: var(--beam-CommunityImpact-imageCard-backgroundColor);
        color: var(--beam-CommunityImpact-imageCard-foregroundColor);
      }

      .image-card-image-box {
        height: 200px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        padding: 0 24px 16px;
        overflow-wrap: break-word;
        background-color: #555;
        background-blend-mode: overlay;
        background-size: cover;
        background-repeat: no-repeat;
      }

      .image-card-cause {
        ${n("--beam-CommunityImpact-imageCard-cause")}
      }

      .image-card-name {
        ${n("--beam-CommunityImpact-imageCard-name")}
      }

      .image-card-progress {
        margin-top: var(--beam-CommunityImpact-imageCard-progress-marginTop);
      }

      .image-card-progressText {
        ${n("--beam-CommunityImpact-imageCard-progressText")}
      }

      .image-card-description {
        ${n("--beam-CommunityImpact-imageCard-description")}
      }

      .image-card-link {
        ${n("--beam-CommunityImpact-imageCard-link")}
      }

      .image-card-link-arrow {
        display: var(--beam-CommunityImpact-imageCard-linkArrow-display, "none");
      }

      .image-card-goal-completion {
        ${n("--beam-CommunityImpact-imageCard-goalCompletion")}
        font-style: var(--beam-CommunityImpact-imageCard-goalCompletion-fontStyle, italic);
      }

      .image-card-footer {
        margin-top: var(--beam-CommunityImpact-imageCard-footer-marginTop);
      }

      /* Icon Style Cards */

      .icon-card {
        display: flex;
        flex-direction: column;
        justify-content: start;
        align-items: center;
      }

      .icon-card-icon {
        height: 50px;
      }

      .icon-card-cause {
        ${n("--beam-CommunityImpact-iconCard-cause")}
      }

      .icon-card-name {
        ${n("--beam-CommunityImpact-iconCard-name")}
      }

      .icon-card-progress {
        margin-top: var(--beam-CommunityImpact-iconCard-progress-marginTop);
      }

      .icon-card-progressText {
        ${n("--beam-CommunityImpact-iconCard-progressText")}
        margin-left: 10px;
      }

      .icon-card-description {
        ${n("--beam-CommunityImpact-iconCard-description")}
        text-align: var(--beam-CommunityImpact-iconCard-description-textAlign, left);
      }

      .icon-card-link {
        ${n("--beam-CommunityImpact-iconCard-link")}
      }

      .icon-card-link-arrow {
        display: var(--beam-CommunityImpact-iconCard-linkArrow-display, "none");
      }

      .icon-card-goal-completion {
        ${n("--beam-CommunityImpact-iconCard-goalCompletion")}
        font-style: var(--beam-CommunityImpact-iconCard-goalCompletion-fontStyle, italic);
      }

      .icon-card-footer {
        margin-top: var(--beam-CommunityImpact-iconCard-footer-marginTop);
      }
    `],d([g({type:String})],s.prototype,"apiKey",2),d([g({type:Number})],s.prototype,"chainId",2),d([g({type:String})],s.prototype,"baseUrl",2),d([g({type:String})],s.prototype,"cardStyle",2),d([g({type:String})],s.prototype,"lang",2),d([g({type:Boolean})],s.prototype,"debug",2),d([I()],s.prototype,"selectedFilter",2),w(s);export{s as BeamCommunityImpact};
//# sourceMappingURL=community-impact.js.map
