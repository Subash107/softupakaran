// Lightweight runtime guards for older browsers.
(function () {
  if (!window.requestIdleCallback) {
    window.requestIdleCallback = function (cb) {
      return setTimeout(function () {
        cb({ didTimeout: false, timeRemaining: function () { return 0; } });
      }, 1);
    };
  }
  if (!window.cancelIdleCallback) {
    window.cancelIdleCallback = function (id) {
      clearTimeout(id);
    };
  }
})();
