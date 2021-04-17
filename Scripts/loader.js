
//I put the quotes here (I'd rather do it in a json) because its instant. Quotes sourced from https://mymodernmet.com/art-quotes/ and https://www.goodreads.com/quotes/tag/art
const quotesList = [
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
]

//This loader should be right after the loading section
const loadingSection = document.getElementById("loading-section"),
    quote = loadingSection.querySelector("blockquote p");

//Load Events - these are optional events that extend the period of time it takes to load until these are completed
const loadEvents = [],
    complete = loadEvent => {
        loadEvent.completed = true;
        finish();
    }
function LoadEvent(name) {
    //Name is merely for testing purposes
    this.name = name;
    loadEvents.push(this);
}

//Function to call when a load event is completed or the window loads
let finish, extendIntro, onComplete;
if (quote) {
    const cite = loadingSection.querySelector("blockquote cite"),
        randomQuote = gsap.utils.random(quotesList);
    //Set the quote
    quote.textContent = `"${randomQuote.quote}"`;
    cite.textContent = `- ${randomQuote.cite}`;
    //On the dom load animate away
    finish = () => {
        //You can only finish if all loadEvents are completed
        if (!loadEvents.every(function (loadEvent) { return loadEvent.completed })) return;

        //This mode will alert the user that they may skip the read delay by clicking
        const skipAlert = document.createElement("div");
        skipAlert.appendChild(createImg(`Icons/cursorStates/arrow.svg`));
        const alertText = document.createElement("p");
        alertText.textContent = "Click to skip wait";
        skipAlert.appendChild(alertText);
        customCursor.addState("skipAlert", skipAlert, 9999999);
        customCursor.setState("skipAlert");

        //This animates the loader away
        function animate() {
            if (onComplete) onComplete();

            //Stop alerting the user
            customCursor.removeState("skipAlert");

            //Remove the delays and events
            window.removeEventListener("keydown", skip);
            window.removeEventListener("click", skip);
            delayObj = null;

            //Split the text for individual animation
            splitText(quote);
            const introTL = new gsap.timeline({ defaults: { ease: "power2.in", duration: .5 }, onComplete: blockTransition, onCompleteParams: [loadingSection] })
                .to("#loading-section p", { yPercent: 100, stagger: { from: "end", each: .1 } })
                .to(loadingSection, { clipPath: "inset(0 100% 0 0)", display: "none", ease: "power2.out" });

            //If the page wants to add additional animation in the intro
            if (extendIntro) extendIntro(introTL);

            //Reveal nav at the end
            if (!sizeQuery.matches) return;
            introTL.from("nav li", {
                yPercent: -200, duration: .25, ease: "power2.out", clearProps: "yPercent", stagger: {
                    each: .1,
                    from: "center"
                }
            });
        }

        //The read delay will be the number of words multiplied by seconds per word
        const spw = .25, readDelay = randomQuote.quote.split(" ").length * spw;
        let delayObj = gsap.delayedCall(readDelay, animate);

        //Adds ability to skip reading delay
        function skip(e) {
            e.preventDefault();
            delayObj.kill();
            animate();
        }
        window.addEventListener("keydown", skip);
        window.addEventListener("click", skip);
    }
} else {
    finish = () => {
        if (onComplete) onComplete();

        //You can only finish if all loadEvents are completed or there are no loadEvents
        if (!loadEvents.length || !loadEvents.every(function (loadEvent) { return loadEvent.completed })) return;

        //Fade awwwwwwwwwway
        new gsap.timeline({ defaults: { ease: "power2.in", duration: .5 } })
            .to(loadingSection, { clipPath: "inset(0 100% 0 0)", display: "none" });
    }
}
const windowLoadEvent = new LoadEvent("DOM");
window.addEventListener("load", () => {
    complete(windowLoadEvent)

    //For cooler redirects
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