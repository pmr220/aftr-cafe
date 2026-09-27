(() => {
  const rail = document.querySelector('#placePhotoRail');
  if (!rail) return;
  const buttons = document.querySelectorAll('[data-place-direction]');
  const update = () => {
    const end = rail.scrollWidth - rail.clientWidth;
    buttons.forEach(button => {
      button.disabled = Number(button.dataset.placeDirection) < 0
        ? rail.scrollLeft <= 2 : rail.scrollLeft >= end - 2;
    });
  };
  buttons.forEach(button => button.addEventListener('click', () => {
    const photo = rail.querySelector('figure');
    if (!photo) return;
    const step = photo.getBoundingClientRect().width + parseFloat(getComputedStyle(rail).gap || '0');
    rail.scrollBy({
      left: Number(button.dataset.placeDirection) * step,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
    });
  }));
  rail.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
