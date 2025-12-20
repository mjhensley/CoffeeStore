/**
 * INSTANT LOAD v2 - Ultra-Fast Page Transitions
 * Prerenders pages aggressively for instant navigation
 */
(function(){
  'use strict';
  
  // TURBO MODE: Prefetch all critical pages immediately on load
  const CRITICAL_PAGES=['/collections.html','/subscribe.html','/gear.html','/cold-brew.html','/our-story.html'];
  
  // Speculation Rules for instant navigation (Chrome 109+)
  if(HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')){
    const r=document.createElement('script');
    r.type='speculationrules';
    r.textContent=JSON.stringify({
      prerender:[{source:"document",where:{href_matches:"/*"},eagerness:"eager"}],
      prefetch:[{source:"document",where:{href_matches:"/*"},eagerness:"immediate"}]
    });
    document.head.appendChild(r);
  }
  
  // Immediate prefetch of critical pages
  const prefetched=new Set();
  function prefetchPage(url){
    if(prefetched.has(url))return;
    prefetched.add(url);
    const link=document.createElement('link');
    link.rel='prefetch';
    link.href=url;
    link.as='document';
    document.head.appendChild(link);
  }
  
  // Prefetch critical pages after initial paint
  requestIdleCallback?requestIdleCallback(()=>{
    CRITICAL_PAGES.forEach(prefetchPage);
  }):(()=>{setTimeout(()=>CRITICAL_PAGES.forEach(prefetchPage),100)})();
  
  // Super aggressive prefetch on hover (0ms delay)
  document.addEventListener('mouseover',e=>{
    const a=e.target.closest('a');
    if(!a||!a.href||prefetched.has(a.href))return;
    if(!a.href.startsWith(location.origin))return;
    prefetchPage(a.href);
    // Also prerender for Chrome
    const prerender=document.createElement('link');
    prerender.rel='prerender';
    prerender.href=a.href;
    document.head.appendChild(prerender);
  },{passive:true,capture:true});
  
  // Instant click navigation
  document.addEventListener('mousedown',e=>{
    const a=e.target.closest('a');
    if(!a||!a.href||a.target==="_blank")return;
    if(!a.href.startsWith(location.origin))return;
    if(e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey)return;
    document.body.style.cursor='progress';
  },{passive:true});
  
  // Touchstart for mobile instant tap
  document.addEventListener('touchstart',e=>{
    const a=e.target.closest('a');
    if(!a||!a.href||prefetched.has(a.href))return;
    if(!a.href.startsWith(location.origin))return;
    prefetchPage(a.href);
  },{passive:true});

  // Preload visible images immediately with high priority
  if('IntersectionObserver' in window){
    const io=new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          const img=entry.target;
          if(img.dataset.src){
            img.src=img.dataset.src;
            delete img.dataset.src;
          }
          img.loading='eager';
          img.fetchPriority='high';
          io.unobserve(img);
        }
      });
    },{rootMargin:'300px',threshold:0});
    
    document.querySelectorAll('img[loading="lazy"]').forEach(img=>io.observe(img));
  }

  // Force immediate paint
  requestAnimationFrame(()=>{
    document.documentElement.classList.add('loaded');
    document.body.style.opacity='1';
  });
  
  // Mark interactive ASAP
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>document.documentElement.classList.add('interactive'));
  }else{
    document.documentElement.classList.add('interactive');
  }
  
  // Preload all nav links
  document.querySelectorAll('nav a, .nav-links a').forEach(a=>{
    if(a.href&&a.href.startsWith(location.origin))prefetchPage(a.href);
  });
  
  console.log('⚡ Instant Load v2 active');
})();

