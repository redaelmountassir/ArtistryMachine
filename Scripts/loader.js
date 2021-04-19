const LoadingManager = {
    loadingSection: document.getElementById("loading-section"),
    /*
        I put the quotes here vs json because its instant.
        Quotes sourced from https://mymodernmet.com/art-quotes/ and https://www.goodreads.com/quotes/tag/art
    */
    quotes: [
        {
            quote: "Art evokes the mystery without which the world would not exist.",
            cite: "René Magritte"
        },
        {
            quote: "The true use of art is, first, to cultivate the artist’s own spiritual nature.",
            cite: "George Inness"
        },
        {
            quote: "Before I start carving the idea must be almost complete. I say ‘almost' because the really important thing seems to be the sculptor's ability to let his intuition guide him over the gap between conception and realization without compromising the integrity of the original idea.",
            cite: "Barbara Hepworth"
        },
        {
            quote: "If I could say it in words there would be no reason to paint.",
            cite: "Edward Hopper"
        },
        {
            quote: "The richness I achieve comes from nature, the source of my inspiration.",
            cite: "Claude Monet"
        },
        {
            quote: "The beautiful, which is perhaps inseparable from art, is not after all tied to the subject, but to the pictorial representation. In this way and in no other does art overcome the ugly without avoiding it.",
            cite: "Paul Klee"
        },
        {
            quote: "Every artist was first an amateur.",
            cite: "Ralph Waldo Emerson"
        },
        {
            quote: "Whether you succeed or not is irrelevant, there is no such thing. Making your unknown known is the important thing.",
            cite: "Georgia O’Keeffe"
        },
        {
            quote: "If you hear a voice within you say ‘you cannot paint,' then by all means paint, and that voice will be silenced.",
            cite: "Vincent van Gogh"
        },
        {
            quote: "We don’t make mistakes, just happy little accidents.",
            cite: "Bob Ross ☁ 😃"
        },
        {
            quote: "Have no fear of perfection, you'll never reach it.",
            cite: "Salvador Dalí"
        },
        {
            quote: "Every child is an artist. The problem is how to remain an artist once we grow up.",
            cite: "Pablo Picasso"
        },
        {
            quote: "There are no rules. That is how art is born, how breakthroughs happen. Go against the rules or ignore the rules. That is what invention is about.",
            cite: "Helen Frankenthaler"
        },
        {
            quote: "Everything you can imagine is real.",
            cite: "Pablo Picasso"
        },
        {
            quote: "Painting is poetry that is seen rather than felt, and poetry is painting that is felt rather than seen.",
            cite: "Leonardo da Vinci"
        },
        {
            quote: "It is good to love many things, for therein lies the true strength, and whosoever loves much performs much, and can accomplish much, and what is done in love is well done.",
            cite: "Vincent Van Gogh"
        }
    ],
    populateText: function () {
        this.quote = this.loadingSection.querySelector("blockquote p");
        const cite = this.loadingSection.querySelector("blockquote cite"),
            randomQuote = gsap.utils.random(this.quotes);
        this.quote.textContent = `"${randomQuote.quote}"`;
        cite.textContent = `- ${randomQuote.cite}`;
    },
    tryFinish: function () {
        //You can only finish if all loadEvents are completed
        if (!this.loadEvents.every(loadEvent => loadEvent.finished)) return;

        //Callback for completion
        if (this.onComplete) this.onComplete();
        this.animation.play(true);
    }
}

LoadingManager.animation = {
    createDelay: function (delay) {
        this.removeDelay = this.removeDelay.bind(this);
        this.play = this.play.bind(this);

        //This mode will alert the user that they may skip the read delay by clicking
        const skipAlert = document.createElement("div");
        skipAlert.appendChild(createImg(`Icons/cursorStates/arrow.svg`));
        const alertText = document.createElement("p");
        alertText.textContent = "Click to skip wait";
        skipAlert.appendChild(alertText);
        customCursor.addState("skipAlert", skipAlert, 9999999);
        customCursor.setState("skipAlert");

        //The read delay will be the number of words multiplied by seconds per word
        const readDelay = LoadingManager.quote.textContent.split(" ").length * delay;
        this.delayObj = gsap.delayedCall(readDelay, this.play);

        //Adds ability to skip reading delay
        window.addEventListener("keydown", this.removeDelay);
        window.addEventListener("click", this.removeDelay);
    },
    removeDelay: function () {
        if (this.delayCompleted) return;

        this.delayCompleted = true;

        this.delayObj.kill();
        this.delayObj = null;

        //Untie any events
        window.removeEventListener("keydown", this.removeDelay);
        window.removeEventListener("click", this.removeDelay);

        //Stop alerting the user
        customCursor.removeState("skipAlert");

        this.play();
    },
    play: function (withDelay) {
        if (withDelay) return this.createDelay(.25);

        this.removeDelay();

        //Split the text for individual animation
        splitText(LoadingManager.quote);
        const introTL = new gsap.timeline({
            defaults: { ease: "power2.out", duration: .5 },
            onComplete: blockTransition, onCompleteParams: [LoadingManager.loadingSection]
        })
            .to("#loading-section p", { yPercent: 100, ease: "power2.in", stagger: { from: "end", each: .1 } })
            .to(LoadingManager.loadingSection, { clipPath: "inset(0 100% 0 0)", display: "none" });

        //If the page wants to add additional animation in the intro
        if (typeof this.extend === "function") this.extend(introTL);

        //Reveal nav at the end
        if (!sizeQuery.matches) {
            const lines = gsap.utils.toArray("nav .line");
            lines.forEach(line => blockTransition(line));
            //Unlike the desktop anim, there is a set delay for the line animation because the circle looks weird empty
            return introTL.from(lines, {
                transformOrigin: "left", scaleX: 0, stagger: .1, clearProps: "all",
                onComplete: () => lines.forEach(line => allowTransition(line))
            }, "1");
        }
        introTL.from("nav li", {
            yPercent: -200, duration: .25, clearProps: "yPercent", stagger: {
                each: .1,
                from: "center"
            }
        });
    },
    extend: null
}

/*These events can be used to extend make sure additional assets can be loaded before the final animation*/
function LoadEvent(name) {
    if (!LoadingManager.loadEvents) LoadingManager.loadEvents = [];

    //Name is merely for testing purposes
    this.name = name;
    LoadingManager.loadEvents.push(this);
}
LoadEvent.prototype.finish = function () {
    this.finished = true;
    LoadingManager.tryFinish();
}

const windowLoadEvent = new LoadEvent("DOM");
LoadingManager.populateText();
window.addEventListener("load", () => {
    windowLoadEvent.finish();

    //For cooler unloads
    exitCover = document.getElementById("exit-cover");
    if (exitCover) {
        gsap.to(exitCover, { clipPath: "inset(100% 0 0 0)", display: "none", duration: .5, ease: "power2.out" });
        gsap.utils.toArray("a").forEach(link => {
            //Only animate links that should be taking you to another page of my website
            if (link.target && link.target !== "_self") return;
            link.addEventListener("click", function (e) {
                e.preventDefault();
                gsap.fromTo(exitCover, { display: null, clipPath: `inset(0 0 100% 0)` },
                    { clipPath: `inset(0 0 0% 0)`, duration: .5, ease: "power2.out", onComplete: () => window.location.href = this.href });
            });
        })
    }
});