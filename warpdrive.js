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
        setStorage('WRPDRV_VISITOR', visitorID);
        setStorage('WRPDRV_VISIT', visitID);
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
    const now = new Date();
    const urlIDMatches = urlQuery.get(id);
    if (urlIDMatches !== null) return urlIDMatches;
  
    const cookieMatches = document.cookie.match(regex);
    if (cookieMatches) return cookieMatches[1];

    const storageMatches = localStorage.getItem(id);
    const storageItem = JSON.parse(storageMatches);
    if (storageItem && now.getTime() > storageItem.expiry) {
      localStorage.removeItem(id);
      return;
    }
    else if (storageItem) return storageItem.value;
    else return;
  }

  function setStorage(key, value) {
    const now = new Date();
    // expiry date just for tempory testing, will update to proper TTL before release
    const item = {
      value: value,
      expiry: now.getTime() + 10000,
    };
    localStorage.setItem(key, JSON.stringify(item));
    const expires = new Date(Date.now() + 30 * 864e5);
    document.cookie = `${key}=${value}; expires=${expires.toUTCString()}; path=/; domain=${domain}`;
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
    const selectors = interceptor.selectors.length ? interceptor.selectors : ['.waprlink', '[warplink]'];

    switch (type) {
      case 'click': {
        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector)
          elements.forEach(e => {
            e.addEventListener('click', intercept);
          });
        });
        break;
      }
      case 'unload':
        window.addEventListener('beforeunload', intercept);
        break;
      default:
        break;
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
      default:
        // Do Nothing;
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
      setStorage('WRPDRV_VISITOR', visitorID);
      setStorage('WRPDRV_VISIT', visitID);
      await getRoute();
      if (redirect) window.location.href = redirect;
    } catch (err)  {
      console.log(err)
    }
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
