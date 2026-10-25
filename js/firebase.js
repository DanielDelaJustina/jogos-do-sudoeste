// Conversa com o Firebase Realtime Database pela API REST + EventSource (funciona até no navegador
// da TV de 2019, sem precisar do SDK do Firebase). Só é possível ler/gravar dentro de salas/<código>.
(function () {
  var URL = 'https://trilhos-sudoeste-366928-default-rtdb.firebaseio.com';

  function req(method, path, data) {
    return fetch(URL + '/' + path + '.json', {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: data === undefined ? undefined : JSON.stringify(data),
    }).then(function (r) {
      if (!r.ok) throw new Error('Firebase ' + r.status);
      return r.json();
    });
  }

  // aplica uma mudança recebida (put/patch) numa cópia local da árvore
  function setAt(root, path, value) {
    if (path === '/' || path === '') return value;
    var parts = path.replace(/^\//, '').split('/');
    root = root && typeof root === 'object' ? root : {};
    var node = root;
    for (var i = 0; i < parts.length - 1; i++) {
      if (!node[parts[i]] || typeof node[parts[i]] !== 'object') node[parts[i]] = {};
      node = node[parts[i]];
    }
    var last = parts[parts.length - 1];
    if (value === null) delete node[last];
    else node[last] = value;
    return root;
  }

  window.FB = {
    get: function (path) { return req('GET', path); },
    put: function (path, data) { return req('PUT', path, data); },
    patch: function (path, data) { return req('PATCH', path, data); },
    push: function (path, data) { return req('POST', path, data); },
    del: function (path) { return req('DELETE', path); },

    // escuta um caminho em tempo real; cb(dadosCompletos) a cada mudança. Retorna função para parar.
    listen: function (path, cb) {
      var data = null;
      var es = new EventSource(URL + '/' + path + '.json');
      function onPut(e) {
        var msg = JSON.parse(e.data);
        data = setAt(data, msg.path, msg.data);
        cb(data);
      }
      function onPatch(e) {
        var msg = JSON.parse(e.data);
        for (var k in msg.data) data = setAt(data, (msg.path === '/' ? '' : msg.path) + '/' + k, msg.data[k]);
        cb(data);
      }
      es.addEventListener('put', onPut);
      es.addEventListener('patch', onPatch);
      return function () { es.close(); };
    },
  };
})();
