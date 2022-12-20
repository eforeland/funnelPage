!function () {
  const domain = '';
  let visitID;
  let visitorID;
  let funnelID;
  let urlQuery;
  let newRoute;

  async function getRoute() {
    // call API to get routing URL
    const url = 'https://dev.rubix.traffic/api/'
    + funnelID + '?visitID=' + visitID + '&' + 'visitorID=' + visitorID;
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin':'*'
        }
      });
      console.log(res);
      const jsonRes = await res.json();
      return jsonRes;
    } catch (err) {
      // Do Nothing
    }
  }

  async function recoverVisitor() {
    // API call to validate visitorID or create new one
    const url = 'https://dev.rubix.traffic/api/visitor'
    + '?visitID=' + visitID + '&' + 'visitorID=' + visitorID;
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin':'*'
        }
      });
      console.log(res);
      const jsonRes = await res.json();
      return jsonRes;
    } catch (err) {
      // Do Nothing
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

  function interceptClick() {
    if (true) {
      window.location.href = newRoute;
    }
  }

  function interceptRedirect() {
    if (true) {
      window.location.href = newRoute;
    }
  }

  function updateInterceptor(interceptor) {
    const type = interceptor.type;

    if (type === 'click') {
      if (interceptor.selectors.length) {
        interceptor.selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector)
          elements.forEach(e => {
            e.addEventListener("click", interceptClick());
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

  function handleRouting(args) {
//     urlQuery = new Proxy(new URLSearchParams(window.location.search), {
//       get: (searchParams, prop) => searchParams.get(prop),
//     });
    
    urlQuery = new URLSearchParams(window.location.search);
    const myParam = urlParams.get('warpdrive');
    console.log('args: ', args);
    console.log('urlQuery: ', urlQuery, myParam);
//     if (!warpdriveID) return;
    visitID = getVisitID();
    visitorID = getVisitorID();
    funnelID = getFunnelID();
  
    if (!visitID || !visitorID) {
      const res = recoverVisitor()
      visitorID = res.visitor;
      visitID = res.visit;
    }
    setLocalStorage();
    setCookieDomain();
  
    newRoute = getRoute();
  }
  
  function processQueue(queue) {
    while (queue.length > 0) {
      warpdrive(queue.shift());
    }
  }

  function warpdrive(args) {
    if (args[0] === 'config') handleConfig(args);
    if (args[0] === 'route') handleRouting(args);
  }

  window.warpdrive = function () { warpdrive(arguments); };
  processQueue(window.wrpdv);
}();
