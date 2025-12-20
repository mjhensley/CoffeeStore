import{j as u,y as s,f as b,g as d,h as m,k as D}from"../chunks/lit-qtGbjGnK.esm.js";import{c as h,u as g,d as f,e as v,A as y,_ as x,i as P,a as p,b as k}from"../chunks/localize-F31ae3j6.esm.js";import{D as C,k as $,W as w,S as F}from"../chunks/routes-EdlJPTLc.esm.js";import{makeApiKeyHeader as S}from"../utils/makeApiKeyHeader.esm.js";import"../chunks/vendor-jQ8cxMpw.esm.js";import"../chunks/shoelace-components-IDCH5pxy.esm.js";import"../chunks/beam-errors-P-Lu07Ce.esm.js";import"../utils/logger.esm.js";const G=(r="",{borderRadius:e="0px",borderStyle:t="unset",borderColor:o="#000000",borderWidth:i="1px"}={})=>{const a=r.startsWith("--beam-")?r:`--beam-${r}`;return{[`${a}-borderRadius`]:e,[`${a}-borderStyle`]:t,[`${a}-borderColor`]:o,[`${a}-borderWidth`]:i}},T=(r="",{borderRadius:e="0px",borderStyle:t="unset",borderColor:o="#000000",borderWidth:i="1px"}={})=>{const a=r.startsWith("--beam-")?r:`--beam-${r}`;return u(`        border-radius: var(${a}-borderRadius, ${e});
        border-style: var(${a}-borderStyle, ${t});
        border-color: var(${a}-borderColor, ${o});
        border-width: var(${a}-borderWidth, ${i});
    `)},W=()=>s` <svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  part="svg"
>
  <circle cx="12" cy="12" r="10"></circle>
  <path d="M12 16v-4"></path>
  <path d="M12 8h.01"></path>
</svg>`;var I=Object.defineProperty,A=Object.getOwnPropertyDescriptor,n=(r,e,t,o)=>{for(var i=o>1?void 0:o?A(e,t):e,a=r.length-1,c;a>=0;a--)(c=r[a])&&(i=(o?c(e,t,i):c(i))||i);return o&&i&&I(e,t,i),i};const L="--beam-ProductDetailsPage-imageUrl";class l extends m{constructor(){super(...arguments),this.baseUrl=C,this.lang="en",this.debug=!1,this.getProductDetailsPageData=async()=>(v(["apiKey","storeId"],this),await $({baseUrl:this.baseUrl,headers:S(this.apiKey),queryParams:{version:"1.0.0",lang:this.configLang,storeId:this.storeId,widgetName:w.product_details_page}})),this.productDetailsPageDataController=new y(this,this.getProductDetailsPageData)}get configLang(){return F[this.lang]||"en"}async updated(e){const t=["storeId","baseUrl","lang","apiKey"];for(const o of t)if(e.has(o)){await this.productDetailsPageDataController.exec();break}}renderWidgetIcon(){const e=this.cssVariables[L];return e?s`
    <span class="icon-container">
      <img src=${e} alt="Widget Icon"></img>
    </span>
    `:s``}render(){const{data:e,loading:t}=this.productDetailsPageDataController;return t?s``:e==null?this.debug?x({error:new Error("No data")}):"":s`
      <style>
        :host {
          ${this.cssVariables.toCSS()}
        }
      </style>
      <div class="root">
        ${this.renderWidgetIcon()}
        <span class="info-container">
          <div class="title-block">
            <h3 class="title">${P(this.configLang,e.config?.web?.title)}</h3>
          </div>
          <div class="description-block">
            <span class="description"> ${P(this.configLang,e.config?.web?.description)}</span
            >${this.renderDisclosureTooltip()}
          </div>
        </span>
      </div>
    `}renderDisclosureTooltip(){const e=this.productDetailsPageDataController.data?.ppgfDisclosure;return e?s`<sl-tooltip class="ppgf-disclosure-tooltip">
          <div class="ppgf-disclosure-tooltip-content" slot="content">${D(e.copy)}</div>
          ${W()}
        </sl-tooltip>`:s``}renderDisclosureTooltipHyperlink(){const e=this.productDetailsPageDataController.data?.ppgfDisclosureHyperlink;return e?s`<a class="ppgf-disclosure-hyperlink" href="${e.url}" target="_blank">${e.copy}</a>`:s``}get cssVariables(){const e={"--beam-ProductDetailsPage-imageWidth":"24px","--beam-ProductDetailsPage-imageHeight":"24px","--beam-ProductDetailsPage-maxWidth":"346px","--beam-ProductDetailsPage-paddingTop":"8px","--beam-ProductDetailsPage-paddingRight":"12px","--beam-ProductDetailsPage-paddingBottom":"8px","--beam-ProductDetailsPage-paddingLeft":"15px","--beam-ProductDetailsPage-InfoContainer-marginLeft":"8px","--beam-ProductDetailsPage-backgroundColor":"unset","--beam-ProductDetailsPage-TooltipIcon-width":"10px","--beam-ProductDetailsPage-TooltipIcon-color":"inherit","--beam-ProductDetailsPage-PPGFDisclosure-backgroundColor":"#000000","--beam-ProductDetailsPage-PPGFDisclosure-paddingTop":"10px","--beam-ProductDetailsPage-PPGFDisclosure-paddingRight":"8px","--beam-ProductDetailsPage-PPGFDisclosure-paddingBottom":"10px","--beam-ProductDetailsPage-PPGFDisclosure-paddingLeft":"8px","--beam-ProductDetailsPage-PPGFDisclosureHyperlink-color":"#5CA3FF",...p("--beam-ProductDetailsPage-title",{fontSize:"12px",fontWeight:"bold"}),"--beam-ProductDetailsPage-title-textAlign":"left",...p("--beam-ProductDetailsPage-description",{marginTop:"4px",fontSize:"12px",lineHeight:"15px"}),"--beam-ProductDetailsPage-description-textAlign":"left",...p("--beam-ProductDetailsPage-PPGFDisclosureTooltipContent",{fontSize:"12px",lineHeight:"16px",color:"#FFFFFF"}),...G("--beam-ProductDetailsPage")},t=this.productDetailsPageDataController?.data?.config?.web?.theme||{},o={...e,...t};return Object.assign(Object.create({toCSS(){return k(this)}}),o)}}l.tagName="beam-product-details-page",l.styles=[h,b`
      :host {
        font-family: var(--beam-fontFamily);
        font-style: var(--beam-fontStyle);
        font-size: var(--beam-fontSize);
        background-color: var(--beam-backgroundColor);
        color: var(--beam-textColor);
        max-width: var(--beam-ProductDetailsPage-maxWidth);
        word-break: normal;
        display: block;
      }
      .root {
        display: flex;
        align-items: center;
        padding-top: var(--beam-ProductDetailsPage-paddingTop);
        padding-right: var(--beam-ProductDetailsPage-paddingRight);
        padding-bottom: var(--beam-ProductDetailsPage-paddingBottom);
        padding-left: var(--beam-ProductDetailsPage-paddingLeft);
        width: 100%;
        background-color: var(--beam-ProductDetailsPage-backgroundColor);
        ${T("--beam-ProductDetailsPage")}
      }
      .icon-container {
        width: var(--beam-ProductDetailsPage-imageWidth);
        height: var(--beam-ProductDetailsPage-imageHeight);
        flex-shrink: 0;
      }
      .icon-container > img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      .info-container {
        margin-left: var(--beam-ProductDetailsPage-InfoContainer-marginLeft);
      }
      .title {
        ${g("--beam-ProductDetailsPage-title")}
      }
      .title-block {
        text-align: var(--beam-ProductDetailsPage-title-textAlign);
        line-height: var(--beam-ProductDetailsPage-title-lineHeight);
      }
      .description {
        ${g("--beam-ProductDetailsPage-description")}
      }
      .description-block {
        text-align: var(--beam-ProductDetailsPage-description-textAlign);
        line-height: var(--beam-ProductDetailsPage-description-lineHeight);
      }
      .ppgf-disclosure-tooltip {
        --max-width: 268px;
      }
      .ppgf-disclosure-tooltip::part(body) {
        background-color: var(--beam-ProductDetailsPage-PPGFDisclosure-backgroundColor);
        padding-top: var(--beam-ProductDetailsPage-PPGFDisclosure-paddingTop);
        padding-right: var(--beam-ProductDetailsPage-PPGFDisclosure-paddingRight);
        padding-bottom: var(--beam-ProductDetailsPage-PPGFDisclosure-paddingBottom);
        padding-left: var(--beam-ProductDetailsPage-PPGFDisclosure-paddingLeft);
      }
      .ppgf-disclosure-tooltip::part(base__arrow) {
        background-color: var(--beam-ProductDetailsPage-PPGFDisclosure-backgroundColor);
      }
      .ppgf-disclosure-tooltip-content {
        ${g("--beam-ProductDetailsPage-PPGFDisclosureTooltipContent")}
      }
      .ppgf-disclosure-tooltip-content > a {
        pointer-events: auto;
        color: var(--beam-ProductDetailsPage-PPGFDisclosureHyperlink-color);
      }
      .ppgf-disclosure-hyperlink:visited {
        color: var(--beam-ProductDetailsPage-PPGFDisclosureHyperlink-color);
      }
      .ppgf-disclosure-tooltip > svg {
        width: var(--beam-ProductDetailsPage-TooltipIcon-width);
        color: var(--beam-ProductDetailsPage-TooltipIcon-color);
        height: auto;
        vertical-align: middle;
      }
    `],n([d({type:String,reflect:!0})],l.prototype,"baseUrl",2),n([d({type:String,reflect:!1})],l.prototype,"apiKey",2),n([d({type:Number})],l.prototype,"storeId",2),n([d({type:String})],l.prototype,"lang",2),n([d({type:Boolean})],l.prototype,"debug",2),f(l);export{l as BeamProductDetailsPage};
//# sourceMappingURL=product-details-page.esm.js.map
