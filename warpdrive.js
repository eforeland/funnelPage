!async function () {
  let domain = '';
  let visitID;
  let visitorID;
  let funnelID;
  let urlQuery;
  let newRoute;
  let step;
  let redirect = false;
  let abortRedirect;

  async function getRoute() {
    // call API to get routing URL
    step = parseInt(urlQuery.get('step'), 10) || 0;
    page = encodeURIComponent(window.location.href.split('?')[0]);
    console.log(page);
    const url = `https://${domain}/api/${funnelID}?visitID=${visitID}&visitorID=${visitorID}&step=${step}&page=${page}`;

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin':'*'
        }
      });
      const jsonRes = await res.json();
      redirect = jsonRes.redirect || null;
      abortRedirect = jsonRes.abortRedirect || false;
      newRoute = jsonRes.url;
      if (jsonRes.visitorID != visitorID) {
        visitorID = jsonRes.visitorID;
        setLocalStorage();
        setCookieDomain();
      }
    } catch (err) {
      console.log(err);
    }
  }

  async function recoverVisitor() {
    // API call to validate visitorID or create new one
    const url = `https://${domain}/recoverVisitor?visitID=${visitID}&visitorID=${visitorID}`;
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin':'*'
        }
      });
      const jsonRes = await res.json();
      return jsonRes;
    } catch (err) {
      console.log(err);
    }
  }

  function getID(id, regex) {
    const urlIDMatches = urlQuery.get(id);
    if (urlIDMatches !== null) return urlIDMatches;
  
    const cookieMatches = document.cookie.match(regex);
    if (cookieMatches) return cookieMatches[1];

    const storageMatches = localStorage.getItem(id);
    if (storageMatches) return storageMatches;
  }

  function setLocalStorage() {
    localStorage.setItem('visitorID', visitorID);
    localStorage.setItem('visitID', visitID);
  }

  function setCookies(domain, key, value) {
    const expires = new Date(Date.now() + 30 * 864e5);
    document.cookie = `${key}=${value}; expires=${expires.toUTCString()}; path=/; domain=${domain}`;
  }

  function setStorage(domain, key, value) {
    const expires = new Date(Date.now() + 30 * 864e5);
    document.cookie = `${key}=${value}; expires=${expires.toUTCString()}; path=/; domain=${domain}`;
    localStorage.setItem(key, value);
    browser.cookie.set({
      name: key,
      domain: domain,
      expirationDate: expires
    })
  }

  function setCookieDomain() {
    //set cookie on the broadest possible domain
    const splitHostname = window.location.hostname.split('.');
    for (let i = splitHostname.length - 2; i >= 0; i--) {
      let currentCookieHost = splitHostname.slice(i).join('.');
      setCookies(currentCookieHost, 'WRPDRV_VISITOR', visitorID);
      setCookies(currentCookieHost, 'WRPDRV_VISIT', visitID);
      if (document.cookie.indexOf('RBX_VISIT='+visitID) !== -1) break;
    }
  }

  function getFunnelID() {
    const urlFunnelIDMatches = urlQuery.get('warproute');
    if (urlFunnelIDMatches) return urlFunnelIDMatches;
  }

  function intercept(event) {
    if (abortRedirect) return;
    event.preventDefault();
    if (newRoute) {
      window.location.href = newRoute;
    }
  }

  function updateInterceptor(interceptor) {
    const type = interceptor.type.toLowerCase().trim();

    if (type === 'click') {
      if (interceptor.selectors.length) {
        interceptor.selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector)
          elements.forEach(e => {
            e.addEventListener('click', intercept);
          });
        });
      } else {
        const elements = document.querySelectorAll('.warplink');
        elements.forEach(e => {
          e.addEventListener('click', intercept);
        });
      }
    }

    if (type === 'unload') {
      window.addEventListener('beforeunload', intercept)
    }
  }

  function handleConfig(args) {
    switch (args[1]) {
      case 'domain': {
        domain = args[2];
        break;
      } 
      case 'interceptor': {
        updateInterceptor(args[2]);
        break;
      }
    }
  }

  async function handleRouting() {
    try {
      urlQuery = new URLSearchParams(window.location.search);
      if (!urlQuery.has('warproute')) return;
      visitID = getID('visitID', /(?:^|; ?)WRPDRV_VISIT=([^;]+)/);
      visitorID = getID('visitorID', /(?:^|; ?)WRPDRV_VISITOR=([^;]+)/);
      funnelID = getFunnelID();
      if (!visitID || !visitorID) {
        const res = await recoverVisitor();
        visitorID = res?.visitorID;
        visitID = res?.visitID;
      }
      setLocalStorage();
      setCookieDomain();
      await getRoute();
      if (redirect) window.location.href = redirect;
    } catch (err)  {
      console.log(err)
    }
  }
  
  function handleConfig(queue) {
    if (args[1] === 'domain') domain = args[2];
    else if (args[1] === 'interceptor') updateInterceptor(args[2]);
    else return;
  }

  async function handleAPI(args) {
    switch (args[0]) {
      case 'config':
        handleConfig(args);
        break;
      case 'route':
        await handleRouting();
        break;
      default:
        // Do Nothing
    }
  }

  async function processQueue(queue) {
    while (queue.length > 0) {
      await handleAPI(queue.shift());
    }
  }

  window.warpdrive = async function () { await handleAPI(arguments); };
  await processQueue(window.wrpdv);
  handleRouting();
}();
