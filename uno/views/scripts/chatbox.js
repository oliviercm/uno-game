var accordions = document.getElementsByClassName('accordion');

for (var i = 0; i < accordions.length; i++) {
  accordions[i].onclick = function () {
    this.classList.toggle('is-open');
    console.log('click');

    var content = this.previousElementSibling;
    if (content.style.maxHeight) {
      // accordion is currently open, so close it
      content.style.maxHeight = null;
    } else {
      // accordion is currently closed, so open it
      content.style.maxHeight = 300 + 'px';
    }
  };
}
