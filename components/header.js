class Header extends HTMLElement {
	constructor() {
		super();
	}

	connectedCallback() {
		this.innerHTML = `
		<link rel="stylesheet" href="../css/navstyle.css">
		<header class="top-bar">
			<nav>
  			<label for="navcheckbox">
  				<input id="nav-toggle" type="checkbox">
  			</label>
  		<div class="logo">kallileung // OKAYKALE </div>
  		<ul class="links">
    		<li><a href="../">Home</a></li>
    		<li><a href="experience" rel="page">Experience</a></li>
    		<li><a href="projects" rel="page">Projects</a></li>
     		<li><a href="gallery" rel="page">Gallery</a></li>
    		<li><a href="contact" rel="page">Contact</a></li>
  		</ul>
  		<label for="nav-toggle" class="icon-burger">
    		<div class="line"></div>
    		<div class="line"></div>
    		<div class="line"></div>
  		</label>
		</nav>
		</header>
		`;
	}
}

customElements.define('header-component', Header);
