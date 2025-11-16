function loadSVG () {
    fetch("city.svg")
    .then((response) => { return response.text();})
    .then((svg) => {
        document.getElementById('bg_city').innerHTML = svg;
        const svgEl = document.querySelector('#bg_city svg');
        svgEl.setAttribute("preserveAspectRatio", "xMidYMid slice");

        // Performance: set transform origin and enable 3D on the svg and commonly animated children
        // This helps the browser use compositing layers and improves smoothness.
        try {
            gsap.set([svgEl, '#bg_city svg *'], { transformOrigin: '50% 50%', force3D: true });
        } catch (e) {
            // gsap may not be available yet in some edge cases; ignore safely
            console.warn('GSAP not ready for initial set:', e);
        }

        // Add will-change hints to animated elements (also added in CSS). Doing it here ensures
        // the elements are ready after the SVG is in the DOM.
        ['#full_city','#building_top','#wall_side','#wall_front','#interior_wall_side','#interior_wall_top','#interior_wall_side_2','#interior_wall_front'].forEach(sel => {
            document.querySelectorAll(sel).forEach(el => {
                if (el && el.style) el.style.willChange = 'transform, opacity';
            });
        });

        setAnimationScroll();
    })
}
loadSVG();
function setAnimationScroll () {
    gsap.registerPlugin(ScrollTrigger);
    // Use a small scrub value to add smoothing between scroll and timeline progress.
    // This reduces abrupt changes and usually feels much smoother than `scrub: true`.
    let runAnimation = gsap.timeline({
        scrollTrigger: {
            trigger: "#bg_city",
            start: "top top",
            end: "+=1000",
            scrub: 0.5,
            pin: true,
            anticipatePin: 1
        }
    });

    runAnimation.add([
        gsap.to("#bg_city svg", 2, {
            scale: 1.5,
            ease: 'none'
        }),
        gsap.to("#full_city", 2, {
            opacity: 0,
            ease: 'none'
        })
    ])
    .add([
        gsap.to("#building_top", 2, {
            y: -200,
            opacity: 0,
            ease: 'none'
        }),
        gsap.to("#wall_side", 2, {
            x: -200,
            opacity: 0,
            ease: 'none'
        }),
        gsap.to("#wall_front", 2, {
            x: 200, y: 200,
            opacity: 0,
            ease: 'none'
        })
    ])
    .add([
        gsap.to("#interior_wall_side", 2, {
            x: -200,
            opacity: 0,
            ease: 'none'
        }),
        gsap.to("#interior_wall_top", 2, {
            y: -200,
            opacity: 0,
            ease: 'none'
        }),
        gsap.to("#interior_wall_side_2", 2, {
            opacity: 0,
            ease: 'none'
        }),
        gsap.to("#interior_wall_front", 2, {
            opacity: 0,
            ease: 'none'
        })
    ]);
}