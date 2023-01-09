!async function () {
  let pending = [];
  const domain = '';
  let visitID;
  let visitorID;
  let funnelID;
  let urlQuery;
  let newRoute;

  async function getRoute() {
    // call API to get routing URL
    const url = 'https://dev-traffic.rubix.click/api/'
    + funnelID + '?visitID=' + visitID + '&' + 'visitorID=' + visitorID;
    console.log(url)
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin':'*'
        }
      });
      const jsonRes = await res.json();
      console.log(jsonRes)
      newRoute = jsonRes.url;
      // return jsonRes.url;
    } catch (err) {
      console.log(err);
    }
  }

  async function recoverVisitor() {
    // API call to validate visitorID or create new one
    const url = 'https://dev-traffic.rubix.click/recoverVisitor'
    + '?visitID=' + visitID + '&' + 'visitorID=' + visitorID;
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin':'*'
        }
      });
      const jsonRes = await res.json();
      console.log(jsonRes)
      return jsonRes;
    } catch (err) {
      console.log(err);
    }
  }

  function getVisitorID() {
    const urlVisitorIDMatches = urlQuery.get('visitorID');
    if (urlVisitorIDMatches) return urlVisitorIDMatches;
  
    const cookieMatches = document.cookie.match(/(?:^|; ?)WRPDRV_VISITOR=([^;]+)/);
    if (cookieMatches) return cookieMatches[1];
  
    const storageMatches = localStorage.getItem('visitorID');
    if (storageMatches) return storageMatches;
  }
  
  function getVisitID() {
    const urlVisitIDMatches = urlQuery.get('visitID');
    if (urlVisitIDMatches) return urlVisitIDMatches;
  
    const cookieMatches = document.cookie.match(/(?:^|; ?)WRPDRV_VISIT=([^;]+)/);
    if (cookieMatches) return cookieMatches[1];
  
    const storageMatches = localStorage.getItem('visitID');
    if (storageMatches) return storageMatches;
  }

  function setLocalStorage() {
    localStorage.setItem('visitorID', visitorID);
    localStorage.setItem('visitID', visitID);
  }

  function setCookies(domain) {
    const expires = new Date(Date.now() + 30 * 864e5);
    document.cookie = "WRPDRV_VISITOR="
      + visitID 
      + '; expires=' 
      + expires.toUTCString() 
      + '; path=/; domain=' 
      + domain;
    document.cookie = "WRPDRV_VISIT="
      + visitID 
      + '; expires=' 
      + expires.toUTCString() 
      + '; path=/; domain=' 
      + domain;
  }

  function setCookieDomain(cookieDomain) {
    //set cookie on the broadest possible domain
    const splitHostname = window.location.hostname.split('.');
    for (let i = splitHostname.length - 2; i >= 0; i--) {
      let currentCookieHost = splitHostname.slice(i).join('.');
      setCookies(currentCookieHost)
      if (document.cookie.indexOf('RBX_VISIT='+visitID) !== -1) break;
    }
  }

  function getFunnelID() {
    const urlFunnelIDMatches = urlQuery.get('warproute');
    if (urlFunnelIDMatches) return urlFunnelIDMatches;
  }

  function interceptClick(event) {
    event.preventDefault();
    console.log(pending.length, newRoute)
    // if (pending.length) return
    if (newRoute) {
      window.location.href = newRoute;
    }
  }

  function interceptRedirect() {
    if (newRoute) {
      window.location.href = newRoute;
    }
  }

  function updateInterceptor(interceptor) {
    const type = interceptor.type;

    if (type === 'click') {
      if (interceptor.selectors.length) {
        console.log(interceptor.selectors);
        interceptor.selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector)
          console.log(elements);
          elements.forEach(e => {
            e.addEventListener("click", interceptClick);
            console.log(e);
          });
        });
      } else {
        const elements = document.querySelectorAll("warplink");
        elements.forEach(e => {
          e.addEventListener("click", interceptClick());
        });
      }
    }

    if (type === 'onBeforeUnload') {
      window.onbeforeunload = interceptRedirect();
    }
  }

  function handleConfig(args) {
     // console.log('config', args);
    switch (args[1]) {
      case 'domain': domain = args[2]
      case 'interceptor': updateInterceptor(args[2])
    }
  
  }

  async function handleRouting(args) {
//     urlQuery = new Proxy(new URLSearchParams(window.location.search), {
//       get: (searchParams, prop) => searchParams.get(prop),
//     });
    
    urlQuery = new URLSearchParams(window.location.search);
    const warproute = urlQuery.get('warproute');
//     if (!warpdriveID) return;
    visitID = getVisitID();
    visitorID = getVisitorID();
    funnelID = getFunnelID();
    console.log(visitID, visitorID)
    if (!visitID || !visitorID || visitID === 'undefined' || visitorID === 'undefined') {
      const res = await recoverVisitor();
      console.log(res)
      visitorID = res.visitorID;
      visitID = res.visitID;
    }
    setLocalStorage();
    setCookieDomain();
    console.log('before getroute');
    await getRoute();
    console.log('after get route', newRoute);
  }
  
  function handleConfig(queue) {
    queue.forEach(args => {
      if (args[1] === 'domain') domain = args[2]
      if (args[1] === 'interceptor') updateInterceptor(args[2])
    })
  }

  async function handleAPI(args) {
    if (args[0] === 'config') {
      pending.push(args);
      return;
    }
    else {
      handleConfig(pending);
      await handleRouting();
    }
    console.log('new route: ', newRoute);
  }
  
  async function processQueue(queue) {
    while (queue.length > 0) {
      await handleAPI(queue.shift());
    }
  }

  window.warpdrive = async function () { await handleAPI(arguments); };
  await processQueue(window.wrpdv);
}();
