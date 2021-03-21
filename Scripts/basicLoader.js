
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
function LoadEvent() {
    loadEvents.push(this);
}

//Function to call when a load event is completed or the window loads
let finish;
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


        function animate() {
            window.removeEventListener("keydown", skip);
            window.removeEventListener("click", skip);
            delayObj = null;
            splitText(quote);
            new gsap.timeline({ defaults: { ease: "power2.out", duration: .5 }, onComplete: blockTransition, onCompleteParams: [loadingSection] })
                .to("#loading-section p", {
                    yPercent: 100, stagger: {
                        from: "center",
                        each: .1
                    }
                })
                .to(loadingSection, { yPercent: -100, display: "none" });
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
        //You can only finish if all loadEvents are completed or there are no loadEvents
        if (!loadEvents.length || !loadEvents.every(function (loadEvent) { return loadEvent.completed })) return;

        //Fade awwwwwwwwwway
        gsap.to(loadingSection, { yPercent: -100, display: "none" })
    }
}
const windowLoadEvent = new LoadEvent();
window.onload = () => {
    complete(windowLoadEvent);
};

//Splits lastText into lines based off of the built-in css wrapping
function splitText(textElement) {
    //Cache these values for later use
    const words = textElement.textContent.split(" "), wordsLength = words.length;
    //The line builder creates these lines by making a line one at a time, and if a line wraps, makes a new one
    const linesBuilder = new LinesBuilder(textElement, textElement.parentElement);
    //Add each word to the lines
    for (let i = 0; i < wordsLength; i++) { linesBuilder.append(words[i] + " ") };
    //This makes sure that the lines can finish and returns the elements made as a product
    return linesBuilder.finish();
}
function LinesBuilder(replaceElement, parentElement) {
    //This element will hold the new lines
    const lines = document.createElement("div"), ogWidth = replaceElement.offsetWidth;
    //This object works like a loop, changing its current line every iteration
    let currentLine = new Line(lines), baseHeight = null;
    this.append = function (str) {
        //Then add it to the line
        currentLine.append(str);
        //I put this here because baseHeight requires at least one line with one word
        if (!baseHeight) baseHeight = currentLine.height()
        else if (currentLine.height() > baseHeight) {
            //If the line is broken
            //Revert back to the state before it broke and tie loose ends
            currentLine.finish(true);
            //Use this new line for other words
            currentLine = new Line(lines, str);
        }
    };
    this.finish = function () {
        //Officially add to dom
        parentElement.replaceChild(lines, replaceElement);
        currentLine.finish();
        //Force width with fixed amount (because it changes for some reason)
        lines.style.width = ogWidth + "px";
        //Returns the lines for use in animation
        return lines.children;
    };
    //It is IMPERITAVE that the lines are added to the dom. While this is worse for performance, it must be done to ensure that we can get the offsetHeight
    parentElement.appendChild(lines);
}
function Line(lines, str) {
    //Create element and the span (I make a span because it is important for animating seperately for cool overflow hidden affects)
    const line = lines.appendChild(lineTemplate.cloneNode(true)),
        lineSpan = line.firstElementChild;
    //This holds the text last for reverting
    let lastText = "";

    //Line methods
    //Gets the current height
    this.height = () => { return line.clientHeight };
    //Adds text, caches old
    this.append = str => { lastText = lineSpan.textContent; return lineSpan.textContent = lastText + str };
    //Finishes up
    this.finish = revert => {
        //Revert to add line breaking support
        if (revert) lineSpan.textContent = lastText;
        //Remove temp styles
        line.style.display = null;
        line.style.visibility = null;
        line.style.width = null;
        line.style.position = null;
        //This "solidifies" the lines
        line.style.whiteSpace = "nowrap";
        line.style.overflow = "hidden";
    };
    //If there is starter text, apply it
    if (typeof str === "string") this.append(str);
}

//This is the basic line structure for cloning
const lineTemplate = document.createElement("div");
//These are temp styles to ensure that we minimize the impact of checking offset height
lineTemplate.style.display = "inline-block";
lineTemplate.style.visibility = "hidden";
lineTemplate.style.width = "100%";
lineTemplate.style.position = "absolute";
lineTemplate.appendChild(document.createElement("p"));