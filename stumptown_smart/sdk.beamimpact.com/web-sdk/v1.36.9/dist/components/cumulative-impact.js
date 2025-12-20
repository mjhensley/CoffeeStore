import{t as y,h as b,y as u,g as c,f as C,u as I}from"../chunks/lit-yVXn5Cbs.esm.js";import{d as x}from"../chunks/lodash-P8OIs-at.esm.js";import{c as T,d as S,e as E,A as z,_ as f,a as B}from"../chunks/enforce-config-fo8kIfoY.esm.js";import{D,j as k,S as L}from"../chunks/routes-1-1FXngS.esm.js";import{B as $}from"../chunks/beam-errors-P-Lu07Ce.esm.js";import{u as p,_ as V,i as d,d as v}from"../chunks/localize-pzAAkBvG.esm.js";import{i as j}from"../chunks/is-all-html-elements-SdSkxirh.esm.js";import"../utils/logger.js";var A=Object.defineProperty,R=Object.getOwnPropertyDescriptor,h=(n,e,t,a)=>{for(var i=a>1?void 0:a?R(e,t):e,o=n.length-1,r;o>=0;o--)(r=n[o])&&(i=(a?r(e,t,i):r(i))||i);return a&&i&&A(e,t,i),i};class m extends b{constructor(){super(...arguments),this.finalValue=0,this.duration=1500,this.counter=0,this.intervalId=0,this.handleCounterAnimateIfInView=e=>{e.some(t=>t.isIntersecting)&&(this.animateCounter(),this.unobserveScrollTarget())},this.animateCounter=()=>{const e=41.666666666666664,t=e/this.duration*this.finalValue;this.intervalId=setInterval(()=>{const a=this.counter+t;if(a>=this.finalValue){this.counter=this.finalValue,clearInterval(this.intervalId);return}else this.counter=a},e)},this.observer=new IntersectionObserver(this.handleCounterAnimateIfInView,{threshold:.1}),this.observeScrollTarget=()=>{const e=this.scrollTargetElement;e&&this.observer.observe(e)},this.unobserveScrollTarget=()=>{const e=this.scrollTargetElement;e&&this.observer.unobserve(e)}}connectedCallback(){super.connectedCallback();const e=window.matchMedia("(prefers-reduced-motion: reduce)").matches;this.duration===0||e?this.counter=this.finalValue:this.observeScrollTarget()}disconnectedCallback(){super.disconnectedCallback(),this.unobserveScrollTarget(),clearInterval(this.intervalId)}get scrollTargetElement(){return this.scrollTarget?document.querySelector(this.scrollTarget):this}render(){return u`${Math.ceil(this.counter).toLocaleString()}`}}h([c({type:Number})],m.prototype,"finalValue",2),h([c({type:Number})],m.prototype,"duration",2),h([c({type:String})],m.prototype,"scrollTarget",2),h([y()],m.prototype,"counter",2),customElements.get("animated-counter")||customElements.define("animated-counter",m);const O=n=>{const e=n instanceof NodeList?Array.from(n):n;if(e.length===0||!j(e))return;const t=e.sort((i,o)=>{const r=getComputedStyle(i).getPropertyValue("width").replace("px",""),g=getComputedStyle(o).getPropertyValue("width").replace("px","");return parseInt(g)-parseInt(r)})[0],a=getComputedStyle(t).getPropertyValue("width");for(const i of e)getComputedStyle(i).getPropertyValue("width")!==a&&(i.style.width=a)},w={en:{cumulativeImpactTitle:()=>"What we've funded",cumulativeImpactDescription:()=>"Here's the impact that our community has made so far in partnership with Beam. Our impact is growing every day\u2014 scroll to check out the goals we're working toward together right now."},fr:{cumulativeImpactTitle:()=>"Ce que nous avons financ\xE9",cumulativeImpactDescription:()=>"Voici l'impact que notre communaut\xE9 a eu jusqu'\xE0 pr\xE9sent en partenariat avec Beam. Notre impact grandit chaque jour : faites d\xE9filer pour d\xE9couvrir les objectifs vers lesquels nous travaillons ensemble en ce moment."},de:{cumulativeImpactTitle:()=>"Was wir finanziert haben",cumulativeImpactDescription:()=>"Hier ist die Wirkung, die unsere Community bisher in Zusammenarbeit mit Beam erzielt hat. Unsere Wirkung w\xE4chst von Tag zu Tag - scrollen Sie, um einen Blick auf die Ziele zu werfen, auf die wir derzeit gemeinsam hinarbeiten."},es:{cumulativeImpactTitle:()=>"Lo que hemos financiado",cumulativeImpactDescription:()=>"Este es el impacto que nuestra comunidad ha tenido hasta ahora en asociaci\xF3n con Beam. Nuestro impacto crece cada d\xEDa; despl\xE1cese para ver los objetivos por los que estamos trabajando juntos en este momento."},it:{cumulativeImpactTitle:()=>"Cosa abbiamo finanziato",cumulativeImpactDescription:()=>"Ecco l'impatto che la nostra comunit\xE0 ha avuto finora in collaborazione con Beam. Il nostro impatto cresce ogni giorno: scorri per scoprire gli obiettivi a cui stiamo lavorando insieme in questo momento."},pl:{cumulativeImpactTitle:()=>"Co sfinansowali\u015Bmy",cumulativeImpactDescription:()=>"Oto wp\u0142yw, jaki nasza spo\u0142eczno\u015B\u0107 wywar\u0142a dotychczas we wsp\xF3\u0142pracy z Beam. Nasz wp\u0142yw ro\u015Bnie z ka\u017Cdym dniem \u2014 przewi\u0144, aby sprawdzi\u0107 cele, nad kt\xF3rymi obecnie wsp\xF3lnie pracujemy."}};var P=Object.defineProperty,q=Object.getOwnPropertyDescriptor,l=(n,e,t,a)=>{for(var i=a>1?void 0:a?q(e,t):e,o=n.length-1,r;o>=0;o--)(r=n[o])&&(i=(a?r(e,t,i):r(i))||i);return a&&i&&P(e,t,i),i};const U=1.5*1e3;class s extends b{constructor(){super(...arguments),this.baseUrl=D,this.lang="en",this.disableAnimation=!1,this.debug=!1,this.getCumulativeImpactData=async()=>(E(["apiKey","chainId"],this),await k({baseUrl:this.baseUrl,pathParams:{chainId:this.chainId},headers:{authorization:`Api-Key ${this.apiKey}`},queryParams:{version:"1.0.0",lang:this.configLang}})),this.cumulativeImpactDataController=new z(this,this.getCumulativeImpactData),this.resizeElements=x(()=>{O(this.impactRowRefs)},50,{maxWait:50,leading:!0})}get configLang(){return L[this.lang]||"en"}connectedCallback(){super.connectedCallback(),window.addEventListener("resize",this.resizeElements)}async updated(e){const t=["chainId","baseUrl","lang"];for(const a of t)if(e.has(a)){await this.cumulativeImpactDataController.exec();break}this.resizeElements()}render(){const{data:e,error:t,loading:a}=this.cumulativeImpactDataController;return a?V():t?this.debug?f({error:t}):"":e==null?this.debug?f({error:new $("Missing data")}):"":u`
      <style>
        :host {
          ${this.cssVariables.toCSS()}
        }
      </style>
      <div style="display: flex; flex-direction: column;" class="root">
        <div
          style="margin: 10px 0 0 0;"
          tabindex="-1"
          class="options"
          part="options"
          aria-labelledby="beam-RedeemTransaction-title"
        >
          ${this.renderCumulativeImpact(e)}
        </div>
      </div>
    `}renderCumulativeImpact(e){const t=e.impacts?e.impacts?.map(o=>o.value||0):[],a=Math.max(...t),i=t.map(o=>U*Math.log(Math.max(o,1))/Math.log(a));return u`
      <div class="main">
        <div class="title" role="heading">
          ${d(this.configLang,e?.config?.web?.title||"")||w[this.configLang].cumulativeImpactTitle()}
        </div>
        <p class="description">
          ${d(this.configLang,e?.config?.web?.description||"")||w[this.configLang].cumulativeImpactDescription()}
        </p>
        <div class="impact-list">
          ${e.impacts?.map((o,r)=>this.renderCumulativeImpactRow({impact:o,animationDuration:i[r]}))}
        </div>
      </div>
    `}renderCumulativeImpactRow({impact:e,animationDuration:t}){const a=this.cumulativeImpactDataController.data?.config?.web.disableAnimation,i="impact-row-value-counter impact-row-value-floating-counter",o=a?0:t,r=d(this.configLang,e.unit||""),g=d(this.configLang,e.summary||"");return u`
      <div class="impact-row">
        <div class="impact-row-value-container">
          <span class="impact-row-value-counter" style="visibility: hidden;" aria-hidden="true">
            ${e.value.toLocaleString()}
          </span>
            <animated-counter
              class="${i}"
              finalValue=${e.value}
              duration=${o}
            ></animated-counter>
          </span>
        </div>
        <div class="impact-row-description">${r} ${g}</div>
      </div>
    `}get cssVariables(){const e={"--beam-fontFamily":"inherit","--beam-fontStyle":"inherit","--beam-fontSize":"16px","--beam-lineHeight":"1","--beam-textColor":"inherit",...v("--beam-CumulativeImpact-title",{fontSize:"32px"}),...v("--beam-CumulativeImpact-description",{marginTop:"16px",lineHeight:"1.3"}),"--beam-CumulativeImpact-impact-list-marginTop":"24px","--beam-CumulativeImpact-row-marginTop":"24px","--beam-CumulativeImpact-row-value-container-borderBottomWidth":"4px","--beam-CumulativeImpact-row-value-container-borderBottomColor":"currentColor","--beam-CumulativeImpact-row-value-container-paddingTop":"0","--beam-CumulativeImpact-row-value-container-paddingRight":"20px","--beam-CumulativeImpact-row-value-container-paddingBottom":"4px","--beam-CumulativeImpact-row-value-container-paddingLeft":"20px",...v("--beam-CumulativeImpact-row-value-counter",{color:"currentColor",fontSize:"24px",fontWeight:"normal"}),...v("--beam-CumulativeImpact-row-description",{color:"currentColor",fontSize:"16px",fontWeight:"normal",lineHeight:"1.3"}),"--beam-CumulativeImpact-row-description-paddingLeft":"24px","--beam-CumulativeImpact-row-description-paddingRight":"24px","--beam-CumulativeImpact-row-description-mobile-marginTop":"12px"},t=this.cumulativeImpactDataController.data?.config?.web?.theme||{},a={...e,...t};return Object.assign(Object.create({toCSS(){return B(this)}}),a)}}s.tagName="beam-cumulative-impact",s.styles=[T,C`
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
      .main {
        text-align: left;
      }
      .title {
        ${p("--beam-CumulativeImpact-title")}
        text-align: inherit;
      }
      .description {
        ${p("--beam-CumulativeImpact-description")}
        text-align: inherit;
      }
      .impact-list {
        display: flex;
        flex-direction: column;
        margin-top: var(--beam-CumulativeImpact-impact-list-marginTop);
      }
      .impact-row {
        display: flex;
        align-items: center;
        margin-top: var(--beam-CumulativeImpact-row-marginTop);
      }
      .impact-row-value-container {
        position: relative;
        border-bottom-width: var(--beam-CumulativeImpact-row-value-container-borderBottomWidth);
        border-bottom-color: var(--beam-CumulativeImpact-row-value-container-borderBottomColor);
        border-bottom-style: solid;
        padding-top: var(--beam-CumulativeImpact-row-value-container-paddingTop);
        padding-right: var(--beam-CumulativeImpact-row-value-container-paddingRight);
        padding-bottom: var(--beam-CumulativeImpact-row-value-container-paddingBottom);
        padding-left: var(--beam-CumulativeImpact-row-value-container-paddingLeft);
        text-align: center;
        flex-shrink: 0;
      }
      .impact-row-value-counter {
        ${p("--beam-CumulativeImpact-row-value-counter")}
      }
      .impact-row-value-floating-counter {
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
      }
      .impact-row-description {
        ${p("--beam-CumulativeImpact-row-description")}
        padding-left: var(--beam-CumulativeImpact-row-description-paddingLeft);
        padding-right: var(--beam-CumulativeImpact-row-description-paddingRight);
        /* match padding of value of counter for proper centering */
        padding-bottom: var(--beam-CumulativeImpact-row-value-paddingBottom);
        text-align: inherit;
        flex-grow: 1;
      }
      @media (max-width: 500px) {
        .main {
          text-align: center;
        }
        .impact-row {
          flex-direction: column;
        }
        .impact-row-description {
          margin-top: var(--beam-CumulativeImpact-row-description-mobile-marginTop);
          padding-bottom: 0;
        }
      }
    `],l([c({type:String})],s.prototype,"apiKey",2),l([c({type:Number})],s.prototype,"chainId",2),l([c({type:String})],s.prototype,"baseUrl",2),l([c({type:String})],s.prototype,"lang",2),l([c({type:Boolean})],s.prototype,"disableAnimation",2),l([c({type:Boolean})],s.prototype,"debug",2),l([I(".impact-row-value-container")],s.prototype,"impactRowRefs",2),S(s);export{s as BeamCumulativeImpact};
//# sourceMappingURL=cumulative-impact.js.map
