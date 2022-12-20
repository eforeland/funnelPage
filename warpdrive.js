!function () {
  var domain = '';
  var visitID;
  var visitorID;
  var funnelID;
  var searchParams;
  var newRoute;

  async function getRoute() {
    // call API to get routing URL
    var url = 'http://dev.rubix.traffic/api/'
    + funnelID + '?visitID=' + visitID + '&' + 'visitorID=' + visitorID;
    try {
      var res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      var jsonRes = await res.json();
      return jsonRes;
    } catch (err) {
      // Do Nothing
    }
  }

  async function recoverVisitor() {
    // API call to validate visitorID or create new one
    var url = 'http://dev.rubix.traffic/api/visitor'
    + '?visitID=' + visitID + '&' + 'visitorID=' + visitorID;
    try {
      var res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      var jsonRes = await res.json();
      return jsonRes;
    } catch (err) {
      // Do Nothing
    }
  }

  function getVisitorID() {
    var urlVisitorIDMatches = searchParams.get('visitorID');
    if (urlVisitorIDMatches) return urlVisitorIDMatches;
  
    var cookieMatches = document.cookie.match(/(?:^|; ?)WRPDRV_VISITOR=([^;]+)/);
    if (cookieMatches) return cookieMatches[1];
  
    var storageMatches = localStorage.getItem('visitorID');
    if (storageMatches) return storageMatches;
  }
  
  function getVisitID() {
    var urlVisitIDMatches = searchParams.get('visitID');
    if (urlVisitIDMatches) return urlVisitIDMatches;
  
    var cookieMatches = document.cookie.match(/(?:^|; ?)WRPDRV_VISIT=([^;]+)/);
    if (cookieMatches) return cookieMatches[1];
  
    var storageMatches = localStorage.getItem('visitID');
    if (storageMatches) return storageMatches;
  }

  function setLocalStorage() {
    localStorage.set('visitorID', visitorID);
    localStorage.set('visitID', visitID);
  }

  function setCookies(domain) {
    var expires = new Date(Date.now() + 30 * 864e5);
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
    var splitHostname = window.location.hostname.split('.');
    for (var i = splitHostname.length - 2; i >= 0; i--) {
      var currentCookieHost = splitHostname.slice(i).join('.');
      setCookies(currentCookieHost)
      if (document.cookie.indexOf('RBX_VISIT='+visitID) !== -1) break;
    }
  }

  function getFunnelID() {
    var urlFunnelIDMatches = searchParams.get('warproute');
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
    var type = interceptor.type;

    if (type === 'click') {
      if (interceptor.selectors.length) {
        interceptor.selectors.forEach(selector => {
          var elements = document.querySelectorAll(selector)
          elements.forEach(e => {
            e.addEventListener("click", interceptClick());
          });
        });
      } else {
        var elements = document.querySelectorAll("warplink");
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
    switch (args[1]) {
      case 'domain': domain = args[2]
      case 'interceptor': updateInterceptor(args[2])
    }
  
  }

  function handleRouting(args) {
    searchParams = new URLSearchParams(window.location);
    visitID = getVisitID();
    visitorID = getVisitorID();
    funnelID = getFunnelID();
  
    if (!visitID || !visitorID) {
      var res = recoverVisitor()
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
