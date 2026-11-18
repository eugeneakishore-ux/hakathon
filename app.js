    togglePopover(anchor,{id:'actionPopover',render:()=>{
      const el=document.createElement('div');el.className='small-popover';el.style.width='190px';el.style.padding='6px';
      el.innerHTML=items.map((item,i)=>`<button class="popover-link" data-menu-index="${i}" style="color:var(--text);padding:9px 8px">${esc(item.label)} <span>→</span></button>`).join('');
      el.querySelectorAll('[data-menu-index]').forEach(b=>b.onclick=()=>{closePopovers();items[Number(b.dataset.menuIndex)].action();});return el;
    }});
  }

  function exportCsv(filename, rows) {
    const csv=rows.map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\r\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=filename;a.click();URL.revokeObjectURL(a.href);showToast('Export prepared',filename+' downloaded from the local demo.');
  }

  function openWorkflow(event) {
    workflowTrigger=event?.currentTarget||document.activeElement;
    state.workflowStep=0;state.workflow={parcelId:state.parcelId,surveyPlan:true,lidar:true,floorPlan:true,candidateBuilding:true,candidateFloor:true,boundaryConfirmed:false,unitArea:88.8,checksRun:false,generatedId:''};
    $('#workflowModal').hidden=false;document.body.style.overflow='hidden';renderWorkflow();$('#closeWorkflow').focus();
  }

  const workflowTitles=['Select parent parcel','Review survey inputs','Detect building candidates','Confirm unit boundaries','Run geometry checks','Review evidence & prepare'];
  function renderWorkflow() {
    const w=state.workflow,step=state.workflowStep;
    $('#workflowSteps').innerHTML=workflowTitles.map((t,i)=>`<button class="workflow-step ${i===step?'active':''} ${i<step?'done':''}" data-workflow-step="${i}" ${i>step?'disabled':''}><span class="step-index">${i<step?'':i+1}</span><span><strong>${esc(t)}</strong><small>${i===step?'Current step':i<step?'Completed':'Upcoming'}</small></span></button>`).join('');
    $('#workflowSteps').querySelectorAll('[data-workflow-step]').forEach(b=>{if(Number(b.dataset.workflowStep)<step)b.onclick=()=>{state.workflowStep=Number(b.dataset.workflowStep);renderWorkflow();};});
    $('#workflowStepLabel').textContent=`STEP ${Math.min(step+1,6)} OF 6`;
    $('#workflowBack').disabled=step===0;$('#workflowBack').style.opacity=step===0?'.45':'1';
    $('#workflowNext').textContent=step===5?(w.generatedId?'Finish':'Prepare prototype identifier'):'Continue';
    $('#workflowNext').innerHTML=step===5?(w.generatedId?'Finish':'Prepare prototype identifier <span>→</span>'):'Continue <span>→</span>';
    $('#workflowNext').disabled=!workflowValid(step);
    const p=parcels.find(x=>x.id===w.parcelId)||parcels[0];
    const evidenceSummary=[w.surveyPlan?'Survey plan':null,w.lidar?'LiDAR evidence':null,w.floorPlan?'Architectural floor plan':null].filter(Boolean).join(' + ')||'No evidence selected';
    const content=$('#workflowContent');
    if(step===0) content.innerHTML=`<h3>Select the parent parcel</h3><p>Choose the existing land parcel that the vertical mapping candidate will reference.</p><div class="workflow-form-row"><label for="workflowParcel">Parent parcel</label><select id="workflowParcel">${parcels.map(x=>`<option value="${x.id}" ${w.parcelId===x.id?'selected':''}>${esc(x.name)} · ${esc(x.ulpin)}</option>`).join('')}</select></div><div class="workflow-info"><span>i</span><span>Plot area for <b>${esc(p.name)}</b> is ${fmt(p.plot)} m². The parcel’s existing ULPIN stays separate from any prototype vertical-unit reference.</span></div>`;
    if(step===1) content.innerHTML=`<h3>Review survey inputs</h3><p>Confirm which evidence sources support this illustrative mapping candidate.</p><div class="workflow-check-list"><label class="workflow-check"><input type="checkbox" data-workflow-check="surveyPlan" ${w.surveyPlan?'checked':''}><span><strong>Survey plan · revision C</strong><small>Georeferenced site survey · received 12 Nov 2026 · coordinate fit within illustrative tolerance</small></span></label><label class="workflow-check"><input type="checkbox" data-workflow-check="lidar" ${w.lidar?'checked':''}><span><strong>LiDAR point cloud · flight 04</strong><small>Ground and roof returns available · automated height estimate is a candidate only</small></span></label><label class="workflow-check"><input type="checkbox" data-workflow-check="floorPlan" checked><span><strong>Architectural floor plan · Building A</strong><small>5 floor sheets attached · source page references visible for review</small></span></label></div><div class="workflow-info" style="margin-top:13px"><span>i</span><span>Evidence helps reviewers assess a geometry candidate. It does not establish ownership, title or legal boundaries.</span></div>`;
    if(step===2) content.innerHTML=`<h3>Detect building and floor candidates</h3><p>Automated detection suggests structures for a person to review. Select which candidates to include.</p><label class="candidate-card"><input type="checkbox" data-candidate="building" ${w.candidateBuilding?'checked':''}><span class="candidate-symbol">▦</span><span><strong>Building A · 5 above-ground floors</strong><small>Footprint candidate ${fmt(p.footprint)} m² · source: survey plan + LiDAR</small></span><span class="candidate-tag">86% fit</span></label><label class="candidate-card"><input type="checkbox" data-candidate="floor" ${w.candidateFloor?'checked':''}><span class="candidate-symbol">◇</span><span><strong>Floor 3 · Unit 3B candidate</strong><small>Vertical range 9.2 m–12.2 m · source: floor plan</small></span><span class="candidate-tag">Review</span></label><div class="workflow-info"><span>i</span><span>Confidence values help prioritize review. Candidate detection does not prove a boundary or a legal right.</span></div>`;
    if(step===3) content.innerHTML=`<h3>Confirm the unit boundary candidate</h3><p>Check the mapped unit area and vertical range against available source evidence.</p><div class="workflow-form-row"><label for="workflowArea">Unit area · square metres</label><input type="number" id="workflowArea" min="1" max="5000" step="0.1" value="${Number(w.unitArea)}"></div><div class="workflow-info"><span>◇</span><span><b>Selected candidate:</b> Building A · Floor 3 · ${w.unitArea?fmt(w.unitArea):'—'} m² · elevation 9.2 m–12.2 m. Approximate model volume: ${w.unitArea?fmt(Number(w.unitArea)*3):'—'} m³.</span></div><label class="workflow-check" style="margin-top:12px"><input type="checkbox" data-boundary-confirm ${w.boundaryConfirmed?'checked':''}><span><strong>I have reviewed this illustrative boundary against the attached source evidence.</strong><small>This records a local demo review action only. It does not confirm ownership or legal rights.</small></span></label>`;
    if(step===4) content.innerHTML=`<h3>Run geometry and overlap checks</h3><p>Check the selected candidate for basic consistency before the final review step.</p>${w.checksRun?`<div class="validation-card"><span class="checkmark">✓</span><span><strong>Geometry closure check passed</strong><small>Candidate boundary is a closed polygon in this local demo.</small></span></div><div class="validation-card"><span class="checkmark">✓</span><span><strong>Vertical range check passed</strong><small>9.2 m lower and 12.2 m upper elevation are ordered and within the illustrative building range.</small></span></div><div class="validation-card"><span class="checkmark">✓</span><span><strong>Overlap check passed for selected candidate</strong><small>This simple check covers the selected unit only; flagged items elsewhere remain in the review queue.</small></span></div>`:`<div class="workflow-info"><span>i</span><span>Checks flag geometry conditions for human assessment. Passing these checks does not validate an official boundary or title.</span></div><button class="button button-secondary" id="runChecks" style="margin-top:15px">Run geometry checks <span>→</span></button>`}`;
    if(step===5) content.innerHTML=w.generatedId?`<h3>Prototype reference prepared</h3><p>This local demo reference is not an official identifier and does not replace the parcel’s existing ULPIN.</p><div class="prototype-result"><small>PROTOTYPE UNIT REFERENCE · LOCAL DEMO ONLY</small><strong>${esc(w.generatedId)}</strong><div class="workflow-info" style="margin-top:12px"><span>i</span><span>Parent parcel ${esc(p.ulpin)} remains unchanged. This prototype reference carries no legal or ownership meaning.</span></div></div>`:`<h3>Review evidence and prepare a prototype reference</h3><p>Check the final summary. The new local reference is an illustrative workflow output, not an official 3D ULPIN format.</p><div class="validation-card"><span class="checkmark">✓</span><span><strong>${esc(p.name)} · ${esc(p.ulpin)}</strong><small>Parent parcel selected · plot area ${fmt(p.plot)} m²</small></span></div><div class="validation-card"><span class="checkmark">✓</span><span><strong>Building A · Floor 3 · Unit 3B</strong><small>${fmt(Number(w.unitArea))} m² · 9.2 m–12.2 m · ${fmt(Number(w.unitArea)*3)} m³ illustrative model volume</small></span></div><div class="validation-card"><span class="checkmark">✓</span><span><strong>Survey plan + ${w.lidar?'LiDAR evidence':'floor plan evidence'}</strong><small>Human-reviewed candidate geometry · checks passed for selected unit</small></span></div><div class="workflow-info" style="margin-top:11px"><span>i</span><span>Preparing this reference only updates this browser demo and does not determine ownership, title, land area or legal rights.</span></div>`;
    if(step===5&&!w.generatedId){const evidenceLabel=content.querySelectorAll('.validation-card strong')[2];if(evidenceLabel)evidenceLabel.textContent=evidenceSummary;}
    const floorPlanInput=content.querySelector('[data-workflow-check="floorPlan"]');if(floorPlanInput)floorPlanInput.checked=w.floorPlan;
    content.querySelector('#workflowParcel')?.addEventListener('change',e=>{w.parcelId=e.target.value;renderWorkflow();});
    content.querySelectorAll('[data-workflow-check]').forEach(c=>c.onchange=()=>{w[c.dataset.workflowCheck]=c.checked;$('#workflowNext').disabled=!workflowValid(state.workflowStep);});
    content.querySelectorAll('[data-candidate]').forEach(c=>c.onchange=()=>{w[c.dataset.candidate==='building'?'candidateBuilding':'candidateFloor']=c.checked;$('#workflowNext').disabled=!workflowValid(state.workflowStep);});
    content.querySelector('[data-boundary-confirm]')?.addEventListener('change',e=>{w.boundaryConfirmed=e.target.checked;$('#workflowNext').disabled=!workflowValid(state.workflowStep);});
    content.querySelector('#workflowArea')?.addEventListener('input',e=>{w.unitArea=Number(e.target.value);$('#workflowNext').disabled=!workflowValid(state.workflowStep);const info=content.querySelector('.workflow-info');if(info)info.innerHTML=`<span>◇</span><span><b>Selected candidate:</b> Building A · Floor 3 · ${w.unitArea?fmt(w.unitArea):'—'} m² · elevation 9.2 m–12.2 m. Approximate model volume: ${w.unitArea?fmt(w.unitArea*3):'—'} m³.</span>`;});
    content.querySelector('#runChecks')?.addEventListener('click',()=>{w.checksRun=true;renderWorkflow();});
  }

  function workflowValid(step) {
    const w=state.workflow;
    if(step===0)return !!w.parcelId;
    if(step===1)return w.surveyPlan||w.lidar||w.floorPlan;
    if(step===2)return w.candidateBuilding&&w.candidateFloor;
    if(step===3)return w.boundaryConfirmed&&Number(w.unitArea)>0&&Number(w.unitArea)<=5000;
    if(step===4)return w.checksRun;
    return !!w.generatedId||step===5;
  }

  function nextWorkflow() {
    const w=state.workflow;
    if(state.workflowStep<5){if(!workflowValid(state.workflowStep)){showToast('Complete this step first','Check the required fields and selections.');return;}state.workflowStep++;renderWorkflow();return;}
    if(w.generatedId){closeWorkflow();return;}
    const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let ref='DRAFT-';for(let i=0;i<6;i++)ref+=alphabet[Math.floor(Math.random()*alphabet.length)];w.generatedId=ref;
    const parent=parcels.find(p=>p.id===w.parcelId)||parcels[0];
    activities.unshift({icon:'◇',kind:'geometry',action:'Prototype unit reference prepared',target:`${parent.name} · Floor 3 · Unit 3B`,time:'Just now',state:'Prototype'});
    renderWorkflow();renderActivityPage();showToast('Prototype reference prepared','Local demo only. The parent parcel record is unchanged.');
  }

  function closeWorkflow() {$('#workflowModal').hidden=true;document.body.style.overflow='';if(workflowTrigger?.isConnected&&!workflowTrigger.closest('[hidden]'))workflowTrigger.focus();else{const fallback=$('#startWorkflow');if(fallback&&!fallback.closest('[hidden]'))fallback.focus();}workflowTrigger=null;}

  function init() {
    setTheme(state.theme);renderOverview();renderParcelSelectors();
    $$('.nav-item').forEach(b=>b.onclick=()=>switchPage(b.dataset.page));
    $$('[data-go-page]').forEach(b=>b.onclick=()=>switchPage(b.dataset.goPage));
    $('#themeToggle').onclick=()=>setTheme(state.theme==='light'?'dark':'light');
    $('#locationBtn').onclick=showLocationMenu;
    $('#notificationBtn').onclick=()=>{const p=$('#notificationPopover');const show=p.hidden;closePopovers();p.hidden=!show;$('#notificationBtn').setAttribute('aria-expanded',String(show));};
    $('#profileBtn').onclick=()=>{const p=$('#profilePopover');const show=p.hidden;closePopovers();p.hidden=!show;$('#profileBtn').setAttribute('aria-expanded',String(show));};
    $('#viewReviewBtn').onclick=()=>switchPage('review');$('#profileHelp').onclick=()=>showToast('Workspace preferences','Theme preference is saved in this browser.');
    $('#helpBtn').onclick=()=>showToast('BhuSpace 3D guidance','Select a parcel, inspect its vertical spaces, then review candidate geometry before preparing a local prototype reference.');
    $('#mapLayerBtn').onclick=e=>{e.stopPropagation();bindLayerPopover(e.currentTarget);};$('#mapLayerBtn2').onclick=e=>{e.stopPropagation();bindLayerPopover(e.currentTarget);};
    $('#expandMapBtn').onclick=()=>switchPage('parcel-map');$('#mapOpenLink').onclick=()=>switchPage('parcel-map');
    $('#openSelectedParcel').onclick=()=>switchPage('parcel-map');
    $('#copyUlpinBtn').dataset.copy=currentParcel().ulpin;bindCopy(document);
    $('#parcelMoreBtn').onclick=e=>showActionMenu(e.currentTarget,[{label:'Copy existing ULPIN',action:()=>{navigator.clipboard?.writeText(currentParcel().ulpin).then(()=>showToast('ULPIN copied',currentParcel().ulpin)).catch(()=>showToast('Existing ULPIN',currentParcel().ulpin));}},{label:'Open parcel map',action:()=>switchPage('parcel-map')},{label:'Open 3D properties',action:()=>switchPage('properties')}]);
    $('#zoomIn').onclick=()=>{state.mapZoom=Math.min(1.35,state.mapZoom+.1);$('#overviewMap .map-svg-wrap').style.transform=`scale(${state.mapZoom})`;};$('#zoomOut').onclick=()=>{state.mapZoom=Math.max(.9,state.mapZoom-.1);$('#overviewMap .map-svg-wrap').style.transform=`scale(${state.mapZoom})`;};
    $('#parcelSelect').onchange=e=>setParcel(e.target.value);$('#propertyParcelSelect').onchange=e=>setParcel(e.target.value);
    $('#centerMapBtn').onclick=()=>{state.mapZoom=1;renderParcelMapPage();showToast('Map centered',currentParcel().name);};
    $('#mapGenerateBtn').onclick=$('#propertyGenerateBtn').onclick=$('#startWorkflow').onclick=openWorkflow;
    $$('.view-toggle-btn').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;renderProperties();});
    $('#modelReset').onclick=()=>{state.selectedFloor='3';renderProperties();showToast('View reset','Floor 3 selected.');};
    $('#modelLayers').onclick=e=>showActionMenu(e.currentTarget,[{label:'Show parcel map',action:()=>{state.mode='2d';renderProperties();}},{label:'Show 3D building',action:()=>{state.mode='3d';renderProperties();}},{label:'Center selected floor',action:()=>{renderProperties();showToast('View centered',chosenFloor().name);}}]);
    $$('.filter-chip').forEach(b=>b.onclick=()=>{state.reviewFilter=b.dataset.reviewFilter;renderReviewPage();});
    $$('.activity-filter-tabs button').forEach(b=>b.onclick=()=>{state.activityFilter=b.dataset.activityFilter;renderActivityPage();});
    $('#activityExportBtn').onclick=()=>exportCsv('bhuspace-demo-activity.csv',[['Activity','Feature','Time','Type'],...activities.map(a=>[a.action,a.target,a.time,a.kind])]);
    $('#mapExportBtn').onclick=()=>{const p=currentParcel();exportCsv(`${p.code.toLowerCase()}-parcel-summary.csv`,[['Field','Illustrative demo value'],['Parcel',p.name],['Existing ULPIN',p.ulpin],['Locality',p.locality],['Plot area (m²)',p.plot],['Building footprint (m²)',p.footprint],['Linked buildings',p.buildings],['Vertical units',p.units]]);};
    $('#workflowBack').onclick=()=>{if(state.workflowStep>0){state.workflowStep--;renderWorkflow();}};$('#workflowNext').onclick=nextWorkflow;$('#closeWorkflow').onclick=closeWorkflow;
    $('#workflowModal').addEventListener('click',e=>{if(e.target.id==='workflowModal')closeWorkflow();});
    document.addEventListener('keydown',e=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#globalSearch').focus();}
      if(e.key==='Escape'){closePopovers();if(!$('#workflowModal').hidden)closeWorkflow();}
      if(e.key==='Tab'&&!$('#workflowModal').hidden){const modal=$('#workflowModal'),focusable=$$('button:not(:disabled),select,input,[tabindex="0"]',modal).filter(x=>x.offsetParent!==null);if(focusable.length){const first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
    });
    document.addEventListener('click',e=>{if(!e.target.closest('.popover-anchor')&&!e.target.closest('#locationBtn')&&!e.target.closest('#layerPopover')&&!e.target.closest('#actionPopover')&&!e.target.closest('#mapLayerBtn')&&!e.target.closest('#mapLayerBtn2')&&!e.target.closest('#parcelMoreBtn')&&!e.target.closest('#modelLayers'))closePopovers();});
    const search=$('#globalSearch'),results=$('#searchResults');
    search.addEventListener('input',()=>{
      const q=search.value.trim().toLowerCase();if(q.length<2){results.hidden=true;results.innerHTML='';return;}
      const hits=parcels.filter(p=>[p.name,p.ulpin,p.locality,p.code].some(x=>x.toLowerCase().includes(q)));
      const unitMatch='unit 3b'.includes(q)||'building a'.includes(q);
      results.innerHTML=hits.length?hits.map(p=>`<button class="search-result" data-search-parcel="${p.id}"><span class="result-icon">⌖</span><span><strong>${esc(p.name)}</strong><small>${esc(p.ulpin)} · ${esc(p.locality)}</small></span></button>`).join('')+(unitMatch?`<button class="search-result" data-search-unit><span class="result-icon">◇</span><span><strong>Building A · Unit 3B</strong><small>Floor 3 · ${esc(currentParcel().code)}</small></span></button>`:''):`<div class="search-hint">No parcel or feature matches “${esc(search.value)}”.</div>`;
      results.hidden=false;
      results.querySelectorAll('[data-search-parcel]').forEach(b=>b.onclick=()=>{setParcel(b.dataset.searchParcel);search.value='';results.hidden=true;switchPage('parcel-map');});
      results.querySelector('[data-search-unit]')?.addEventListener('click',()=>{search.value='';results.hidden=true;state.selectedFloor='3';switchPage('properties');});
    });
    search.addEventListener('keydown',e=>{if(e.key==='Enter'){const first=results.querySelector('[data-search-parcel]');if(first)first.click();else if(results.querySelector('[data-search-unit]'))results.querySelector('[data-search-unit]').click();}if(e.key==='Escape'){results.hidden=true;search.blur();}});
    renderOverview();bindCopy(document);
  }

  init();
})();