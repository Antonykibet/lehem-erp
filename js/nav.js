/* Sidebar / mobile hamburger. Shared by both screens. */
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var list = document.querySelector('.nav-list');
  var foot = document.querySelector('.sidebar-foot');
  if (!toggle || !list) { return; }

  var iconOpen = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>';
  var iconClosed = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></svg>';

  function setOpen(open) {
    list.classList.toggle('open', open);
    if (foot) { foot.classList.toggle('open', open); }
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.innerHTML = open ? iconOpen : iconClosed;
  }

  setOpen(false);
  toggle.addEventListener('click', function () {
    setOpen(list.classList.contains('open') === false);
  });
})();
