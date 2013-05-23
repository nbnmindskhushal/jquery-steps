/*!
 * jQuery Steps Plugin v0.9.7b - A powerful jQuery wizard plugin that supports accessibility and HTML5
 * https://github.com/rstaib/jquery-steps
 *
 * Copyright (c) 2013 Rafael J. Staib
 * Released under the MIT license
 *
 * Follow me on twitter: https://twitter.com/@RafaelStaib
 *
 * Requires jQuery version 1.4.4 or higher
 * Please report issues at: https://github.com/rstaib/jquery-steps/issues
 */

/* 
 * TODOs:
 * - Add tests and styles for loading animation (Spinner)
 * - Add tests for add, insert and remove
 * - Add tests in general
 * - Shrink the comprehensive code
 *
 * Planed Features:
 * - Progress bar
 * - Advanced Accessibility support (WAI-ARIA)
 * - Implement preloadContent for async and iframe content types.
 * - Implement functionality to skip a certain amount of steps 
 * - Dynamic settings change (setOptions({ enablePagination: false }))
 * - Dynamic step update (setStepContent(0, { title: "", content: "" }))
 * - Jump from any page to a specific step (via uri hash tag test.html#steps-uid-1-3)
 * - Add Swipe gesture for devices that support touch
 * - Allow clicking on the next step even if it is disabled (so that people can decide whether they use prev button or the step button next to the current step)
 *
 */

/**
 * @module jQuery.steps
 * @requires jQuery (always required), jQuery.cookie (only required if saveState is `true`)
 */
(function ($)
{
    /**
     * A global unique id count.
     *
     * @static
     * @private
     * @property _uniqueId
     * @type Integer
     **/
    var _uniqueId = 0;

    /**
     * The plugin prefix for cookies.
     *
     * @final
     * @private
     * @property _cookiePrefix
     * @type String
     **/
    var _cookiePrefix = "jQu3ry_5teps_St@te_";

    /**
     * Represents a jQuery wizard plugin.
     *
     * @class steps
     * @constructor
     * @param [method={}] The name of the method as `String` or an JSON object for initialization
     * @param [params=]* {Array} Additional arguments for a method call
     * @chainable
     **/
    $.fn.steps = function (method)
    {
        if ($.fn.steps[method])
        {
            return $.fn.steps[method].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof method === "object" || !method)
        {
            return initialize.apply(this, arguments);
        }
        else
        {
            $.error("Method " + method + " does not exist on jQuery.steps");
        }
    };

    /**
     * An enum represents the different content types of a step and their loading mechanisms.
     *
     * @class contentMode
     * @for steps
     **/
    $.fn.steps.contentMode = {
        /**
         * HTML embedded content
         *
         * @readOnly
         * @property html
         * @type Integer
         * @for contentMode
         **/
        html: 0,

        /**
         * IFrame embedded content
         *
         * @readOnly
         * @property iframe
         * @type Integer
         * @for contentMode
         **/
        iframe: 1,

        /**
         * Async embedded content
         *
         * @readOnly
         * @property async
         * @type Integer
         * @for contentMode
         **/
        async: 2
    };

    /**
     * An enum that represents the various transition animations.
     *
     * @class transitionEffect
     * @for steps
     **/
    $.fn.steps.transitionEffect = {
        /**
         * No transition animation
         *
         * @readOnly
         * @property none
         * @type Integer
         * @for transitionEffect
         **/
        none: 0,

        /**
         * Fade in transition
         *
         * @readOnly
         * @property fade
         * @type Integer
         * @for transitionEffect
         **/
        fade: 1,

        /**
         * Slide up transition
         *
         * @readOnly
         * @property slide
         * @type Integer
         * @for transitionEffect
         **/
        slide: 2,

        /**
         * Slide left transition
         *
         * @readOnly
         * @property slideLeft
         * @type Integer
         * @for transitionEffect
         **/
        slideLeft: 3
    };

    /**
     * An object that represents the default settings.
     * There are two possibities to override the sub-properties.
     * Either by doing it generally (global) or on initialization.
     *
     * @static
     * @class defaults
     * @for steps
     * @example
     *   // Global approach
     *   $.steps.defaults.headerTag = "h3";
     * @example
     *   // Initialization approach
     *   $("#wizard").steps({ headerTag: "h3" });
     **/
    $.fn.steps.defaults = {
        /**
         * The header tag is used to find the step button text within the declared wizard area.
         *
         * @property headerTag
         * @type String
         * @default "h1"
         * @for defaults
         **/
        headerTag: "h1",

        /**
         * The body tag is used to find the step content within the declared wizard area.
         *
         * @property bodyTag
         * @type String
         * @default "div"
         * @for defaults
         **/
        bodyTag: "div",

        /**
         * The content container tag which will be used to wrap all step contents.
         *
         * @property contentContainerTag
         * @type String
         * @default "div"
         * @for defaults
         **/
        contentContainerTag: "div",

        /**
         * The action container tag which will be used to wrap the pagination navigation.
         *
         * @property actionContainerTag
         * @type String
         * @default "div"
         * @for defaults
         **/
        actionContainerTag: "div",

        /**
         * The steps container tag which will be used to wrap the steps navigation.
         *
         * @property stepsContainerTag
         * @type String
         * @default "div"
         * @for defaults
         **/
        stepsContainerTag: "div",

        /**
         * The css class which will be added to the outer component wrapper.
         *
         * @property cssClass
         * @type String
         * @default "wizard"
         * @for defaults
         * @example
         *     <div class="wizard">
         *         ...
         *     </div>
         **/
        cssClass: "wizard",

        /*
         * Tempplates
         */

        /**
         * The title template which will be used to create a step button.
         *
         * @property titleTemplate
         * @type String
         * @default "<span class=\"number\">#index#.</span> #title#"
         * @for defaults
         **/
        titleTemplate: "<span class=\"number\">#index#.</span> #title#",

        /**
         * The loading template which will be used to create the loading animation.
         *
         * @property loadingTemplate
         * @type String
         * @default "<span class=\"spinner\"></span> #text#"
         * @for defaults
         **/
        loadingTemplate: "<span class=\"spinner\"></span> #text#",

        /*
         * Behaviour
         */

        /**
         * Sets the focus to the first wizard instance in order to enable the key navigation from the begining if `true`. 
         *
         * @property autoFocus
         * @type Boolean
         * @default false
         * @for defaults
         **/
        autoFocus: false,

        /**
         * Enables all steps from the begining if `true` (all steps are clickable).
         *
         * @property enableAllSteps
         * @type Boolean
         * @default false
         * @for defaults
         **/
        enableAllSteps: false,

        /**
         * Enables keyboard navigation if `true` (arrow left and arrow right).
         *
         * @property enableKeyNavigation
         * @type Boolean
         * @default true
         * @for defaults
         **/
        enableKeyNavigation: true,

        /**
         * Enables pagination if `true`.
         *
         * @property enablePagination
         * @type Boolean
         * @default true
         * @for defaults
         **/
        enablePagination: true,

        /**
         * Suppresses pagination if a form field is focused.
         *
         * @property suppressPaginationOnFocus
         * @type Boolean
         * @default true
         * @for defaults
         **/
        suppressPaginationOnFocus: true,

        /**
         * Enables cache for async loaded or iframe embedded content.
         *
         * @property enableContentCache
         * @type Boolean
         * @default true
         * @for defaults
         **/
        enableContentCache: true,

        /**
         * Shows the finish button if enabled.
         *
         * @property enableFinishButton
         * @type Boolean
         * @default true
         * @for defaults
         **/
        enableFinishButton: true,

        /**
         * Not yet implemented.
         *
         * @property preloadContent
         * @type Boolean
         * @default false
         * @for defaults
         **/
        preloadContent: false,

        /**
         * Shows the finish button always (on each step; right beside the next button) if `true`. 
         * Otherwise the next button will be replaced by the finish button if the last step becomes active.
         *
         * @property showFinishButtonAlways
         * @type Boolean
         * @default false
         * @for defaults
         **/
        showFinishButtonAlways: false,

        /**
         * Prevents jumping to a previous step.
         *
         * @property forceMoveForward
         * @type Boolean
         * @default false
         * @for defaults
         **/
        forceMoveForward: false,

        /**
         * Saves the current state (step position) to a cookie.
         * By coming next time the last active step becomes activated.
         *
         * @property saveState
         * @type Boolean
         * @default false
         * @for defaults
         **/
        saveState: false,

        /**
         * The position to start on (zero-based).
         *
         * @property startIndex
         * @type Integer
         * @default 0
         * @for defaults
         **/
        startIndex: 0,

        /*
         * Animation Effect Configuration
         */

        /**
         * The animation effect which will be used for step transitions.
         *
         * @property transitionEffect
         * @type transitionEffect
         * @default none
         * @for defaults
         **/
        transitionEffect: $.fn.steps.transitionEffect.none,

        /**
         * Animation speed for step transitions (in milliseconds).
         *
         * @property transitionEffectSpeed
         * @type Integer
         * @default 200
         * @for defaults
         **/
        transitionEffectSpeed: 200,

        /*
         * Events
         */

        /**
         * Fires before the step changes and can be used to prevent step changing by returning `false`. 
         * Very useful for form validation. 
         *
         * @property onStepChanging
         * @type Event
         * @default function (event, currentIndex, newIndex) { return true; }
         * @for defaults
         **/
        onStepChanging: function (event, currentIndex, newIndex) { return true; },

        /**
         * Fires after the step has change. 
         *
         * @property onStepChanged
         * @type Event
         * @default function (event, currentIndex, priorIndex) { }
         * @for defaults
         **/
        onStepChanged: function (event, currentIndex, priorIndex) { },

        /**
         * Fires before finishing and can be used to prevent completion by returning `false`. 
         * Very useful for form validation. 
         *
         * @property onFinishing
         * @type Event
         * @default function (event, currentIndex) { return true; }
         * @for defaults
         **/
        onFinishing: function (event, currentIndex) { return true; },

        /**
         * Fires after completion. 
         *
         * @property onFinished
         * @type Event
         * @default function (event, currentIndex) { }
         * @for defaults
         **/
        onFinished: function (event, currentIndex) { },

        /**
         * Contains all labels. 
         *
         * @property labels
         * @type Object
         * @for defaults
         **/
        labels: {
            /**
             * This label is important for accessability reasons.
             * Indicates which step is activated.
             *
             * @property current
             * @type String
             * @default "current step:"
             * @for defaults
             **/
            current: "current step:",

            /**
             * Label for the finish button.
             *
             * @property finish
             * @type String
             * @default "Finish"
             * @for defaults
             **/
            finish: "Finish",

            /**
             * Label for the next button.
             *
             * @property next
             * @type String
             * @default "Next"
             * @for defaults
             **/
            next: "Next",

            /**
             * Label for the previous button.
             *
             * @property previous
             * @type String
             * @default "Previous"
             * @for defaults
             **/
            previous: "Previous",

            /**
             * Label for the loading animation.
             *
             * @property loading
             * @type String
             * @default "Loading ..."
             * @for defaults
             **/
            loading: "Loading ..."
        }
    };

    /*
        Public methods
     */

    /**
     * Gets the current step index.
     *
     * @method getCurrentIndex
     * @return {Integer} The actual step index (zero-based)
     * @for steps
     **/
    $.fn.steps.getCurrentIndex = function ()
    {
        return $(this).data("state").currentIndex;
    };

    /**
     * Gets the current step object.
     *
     * @method getCurrentStep
     * @return {Object} The actual step object
     **/
    $.fn.steps.getCurrentStep = function ()
    {
        return $(this).data("state").currentStep;
    };

    /**
     * Gets a specific step object by index.
     *
     * @method getStep
     * @param index {Integer} An integer that belongs to the position of a step
     * @return {Object} A specific step object
     **/
    $.fn.steps.getStep = function (index)
    {
        var wizard = $(this),
            state = wizard.data("state");

        return (index === state.currentStep) ? state.currentStep : getStepProperties(wizard, index);
    };

    /**
     * Routes to the next step.
     *
     * @method next
     * @return {Boolean} Indicates whether the action executed
     **/
    $.fn.steps.next = function ()
    {
        var wizard = $(this);

        return actionClick(wizard, wizard.data("state").currentIndex + 1);
    };

    /**
     * Routes to the previous step.
     *
     * @method previous
     * @return {Boolean} Indicates whether the action executed
     **/
    $.fn.steps.previous = function ()
    {
        var wizard = $(this);

        return actionClick(wizard, wizard.data("state").currentIndex - 1);
    };

    /**
     * Skips an certain amount of steps.
     *
     * @method skip
     * @param count {Integer} The amount of steps that should be skipped
     * @return {Boolean} Indicates whether the action executed
     **/
    $.fn.steps.skip = function (count)
    {
        throw new Error("Not yet implemented!");
    };

    /**
     * Triggers the onFinishing and onFinished event.
     *
     * @method finish
     **/
    $.fn.steps.finish = function ()
    {
        var wizard = $(this),
            options = wizard.data("options"),
            state = wizard.data("state"),
            currentStep = $(".steps li:eq(" + state.currentIndex + ")", wizard);

        if (wizard.triggerHandler("finishing", [state.currentIndex]))
        {
            currentStep.addClass("done").removeClass("error");
            wizard.triggerHandler("finished", [state.currentIndex]);
        }
        else
        {
            currentStep.addClass("error");
        }
    };

    /**
     * Removes a specific step by an given index.
     *
     * @method remove
     * @param index {Integer} The position (zero-based) of the step to remove
     * @return Indecates whether the item is removed.
     **/
    $.fn.steps.remove = function (index)
    {
        var wizard = $(this),
            options = wizard.data("options"),
            state = wizard.data("state");

        // Index out of range and try deleting current item will return false.
        if (index < 0 || index > state.stepCount || state.currentIndex === index)
        {
            return false;
        }

        var contentContainer = wizard.children(".content");
        $(".title:eq(" + index + ")", contentContainer).remove();
        $(".body:eq(" + index + ")", contentContainer).remove();
        $(".steps > ol > li:eq(" + index + ")", wizard).remove();

        // Reset state values
        if (state.currentIndex > index)
        {
            state.currentIndex--;
            saveStateToCookie(wizard, state.currentIndex);
        }
        state.stepCount--;
        state.currentStep = getStepProperties(wizard, state.currentIndex);

        // Set the "first" class to the new first step button 
        if (index === 0)
        {
            $(".steps > ol > li:first", wizard).addClass("first");
        }

        // Set the "last" class to the new last step button 
        if (index === state.stepCount)
        {
            $(".steps > ol > li:eq(" + index + ")", wizard).addClass("last");
        }

        updateSteps(wizard, index);
        refreshActionState(wizard);

        return true;
    };

    /**
     * Adds a new step.
     *
     * @method add
     * @param step {Object} The step object to add
     * @chainable
     **/
    $.fn.steps.add = function (step)
    {
        var wizard = $(this);
        wizard.steps("insert", wizard.data("state").stepCount, step);
        return wizard;
    };

    /**
     * Inserts a new step to a specific position.
     *
     * @method insert
     * @param index {Integer} The position (zero-based) to add
     * @param step {Object} The step object to add
     * @example
     *     $("#wizard").steps().insert(0, {
     *         title: "Title",
     *         content: "", // optional
     *         contentMode: "async", // optional
     *         contentUrl: "/Content/Step/1" // optional
     *     });
     * @chainable
     **/
    $.fn.steps.insert = function (index, step)
    {
        var wizard = $(this),
            options = wizard.data("options"),
            state = wizard.data("state");

        if (index < 0 || index > state.stepCount)
        {
            throw new Error("Index out of range.");
        }

        var contentContainer = wizard.children(".content"),
            header = $(document.createElement(options.headerTag)).html(step.title),
            body = $(document.createElement(options.bodyTag)).addClass("body").hide();

        if (step.contentMode == null || step.contentMode === $.fn.steps.contentMode.html)
        {
            body.html(step.content);
        }

        if (index === 0)
        {
            contentContainer.prepend(body).prepend(header);
        }
        else
        {
            $(".body:eq(" + (index - 1) + ")", contentContainer).after(body).after(header);
        }

        // Reset state values
        if (state.currentIndex >= index)
        {
            state.currentIndex++;
            saveStateToCookie(wizard, state.currentIndex);
        }
        state.stepCount++;

        transformTitle(wizard, header, index);

        state.currentStep = getStepProperties(wizard, state.currentIndex);

        // Add click event
        $(".steps > ol > li:eq(" + index + ") > a", wizard).bind("click.steps", stepClickHandler);

        updateSteps(wizard, index);
        refreshActionState(wizard);

        return wizard;
    };

    /*
        Private methods
     */

    /**
     * Initializes the component.
     *
     * @static
     * @private
     * @method initialize
     * @param options {Object} The component settings
     **/
    function initialize(options)
    {
        var opts = $.extend(true, {}, $.fn.steps.defaults, options);

        return this.each(function (i)
        {
            var $this = $(this);
            $this.data("options", opts);
            $this.data("state", {
                currentIndex: opts.startIndex,
                currentStep: null,
                stepCount: 0,
                transitionShowElement: null
            });
            createUniqueId($this);

            transform($this);

            if (opts.autoFocus && _uniqueId === 1)
            {
                $(".steps li.current a", $this).focus();
            }

            $this.bind("finishing.steps", opts.onFinishing);
            $this.bind("finished.steps", opts.onFinished);
            $this.bind("stepChanging.steps", opts.onStepChanging);
            $this.bind("stepChanged.steps", opts.onStepChanged);

            if (opts.enableKeyNavigation)
            {
                $this.keyup(keyUpHandler);
            }

            $(".steps a", $this).bind("click.steps", stepClickHandler);
            $(".actions a", $this).bind("click.steps", actionClickHandler);
        });
    }

    /**
     * Fires the action next or previous click event.
     *
     * @static
     * @private
     * @method actionClick
     * @param wizard {Object} The jQuery wizard object
     * @param index {Integer} The position (zero-based) to route to
     * @return {Boolean} Indicates whether the event fired successfully or not
     **/
    function actionClick(wizard, index)
    {
        var options = wizard.data("options"),
            state = wizard.data("state"),
            oldIndex = state.currentIndex;

        if (index >= 0 && index < state.stepCount && !(options.forceMoveForward && index < state.currentIndex))
        {
            var anchor = $(".steps a[href$='-" + index + "']", wizard),
                parent = anchor.parent(),
                isDisabled = parent.hasClass("disabled");
            // Remove the class to make the anchor clickable!
            parent.removeClass("disabled");
            anchor.click();

            // An error occured
            if (oldIndex === state.currentIndex && isDisabled)
            {
                // Add the class again to disable the anchor; avoid click action.
                parent.addClass("disabled");
                return false;
            }

            return true;
        }

        return false;
    }

    /**
     * Routes to a specific step by a given index.
     *
     * @static
     * @private
     * @method goToStep
     * @param wizard {Object} The jQuery wizard object
     * @param index {Integer} The position (zero-based) to route to
     * @return {Boolean} Indicates whether the action succeeded or failed
     **/
    function goToStep(wizard, index)
    {
        var options = wizard.data("options"),
            state = wizard.data("state");

        if (index < 0 || index >= state.stepCount || state.stepCount === 0)
        {
            throw new Error("Index out of range.");
        }

        if (options.forceMoveForward && index < state.currentIndex)
        {
            return;
        }

        var oldIndex = state.currentIndex;
        if (wizard.triggerHandler("stepChanging", [state.currentIndex, index]))
        {
            // Save new state
            state.currentIndex = index;
            saveStateToCookie(wizard, index);
            state.currentStep = getStepProperties(wizard, index);

            // Change visualisation
            updateStepClasses(wizard, index, oldIndex);

            refreshActionState(wizard);
            loadAsyncContent(wizard);

            var stepContents = $(".content > .body", wizard);
            switch (getValidEnumValue($.fn.steps.transitionEffect, options.transitionEffect))
            {
                case $.fn.steps.transitionEffect.fade:
                    state.transitionShowElement = stepContents.eq(index);
                    stepContents.eq(oldIndex).fadeOut(options.transitionEffectSpeed, function ()
                    {
                        var wizard = $(this).parents(":has(.steps)");
                        var state = wizard.data("state");

                        if (state.transitionShowElement)
                        {
                            state.transitionShowElement.fadeIn(options.transitionEffectSpeed);
                            state.transitionShowElement = null;
                        }
                    }).promise();
                    break;

                case $.fn.steps.transitionEffect.slide:
                    state.transitionShowElement = stepContents.eq(index);
                    stepContents.eq(oldIndex).slideUp(options.transitionEffectSpeed, function ()
                    {
                        var wizard = $(this).parents(":has(.steps)");
                        var state = wizard.data("state");

                        if (state.transitionShowElement)
                        {
                            state.transitionShowElement.slideDown(options.transitionEffectSpeed);
                            state.transitionShowElement = null;
                        }
                    }).promise();
                    break;

                    case $.fn.steps.transitionEffect.slideLeft:
                        var newStep = stepContents.eq(index),
                            currentStep = stepContents.eq(oldIndex),
                            outerWidth = currentStep.outerWidth(true),
                            posFadeOut = (index > oldIndex) ? -(outerWidth) : outerWidth,
                            posFadeIn = (index > oldIndex) ? outerWidth : -(outerWidth);

                        currentStep.animate({ left: posFadeOut }, options.transitionEffectSpeed, 
                            function () { $(this).hide(); }).promise();
                        newStep.css("left", posFadeIn + "px").show();
                        newStep.animate({ left: 0 }, options.transitionEffectSpeed).promise();
                        break;

                default:
                    stepContents.eq(oldIndex).hide();
                    stepContents.eq(index).show();
                    break;
            }

            wizard.triggerHandler("stepChanged", [index, oldIndex]);
        }
        else
        {
            $(".steps li:eq(" + oldIndex + ")", wizard).addClass("error");
        }

        return true;
    }

    /**
     * Transforms the hardcoded html structure to a new more useful html structure.
     *
     * @static
     * @private
     * @method transform
     * @param wizard {Object} The jQuery wizard object
     **/
    function transform(wizard)
    {
        var options = wizard.data("options"),
            state = wizard.data("state"),
            contentWrapper = $(document.createElement(options.contentContainerTag)).addClass("content"),
            startIndex = options.startIndex;

        contentWrapper.html(wizard.html());
        wizard.addClass(options.cssClass).empty().append(contentWrapper);

        var stepTitles = contentWrapper.children(options.headerTag),
            stepContents = contentWrapper.children(options.bodyTag).addClass("body").hide();

        if (stepTitles.length > stepContents.length)
        {
            throw new Error("One or more corresponding step contents are missing.");
        }
        else if (stepTitles.length < stepContents.length)
        {
            throw new Error("One or more corresponding step titles are missing.");
        }

        state.stepCount = stepContents.length;

        // Tries to load the saved state (step position)
        if (options.saveState && $.cookie)
        {
            var savedState = $.cookie(_cookiePrefix + getUniqueId(wizard));
            // Sets the saved position to the start index if not undefined or out of range 
            var savedIndex = parseInt(savedState, 0);
            if (!isNaN(savedIndex) && savedIndex < state.stepCount)
            {
                startIndex = savedIndex;
            }
        }

        // Make the start step visible
        stepContents.eq(startIndex).show();

        var stepsWrapper = $(document.createElement(options.stepsContainerTag))
            .addClass("steps").append($(document.createElement("ol")));
        wizard.prepend(stepsWrapper);

        stepTitles.each(function (index)
        {
            transformTitle(wizard, $(this), index);

            if (index < startIndex)
            {
                $(".steps > ol > li:eq(" + index + ")", wizard).addClass("done");
            }

            if (index > startIndex && !options.enableAllSteps)
            {
                $(".steps > ol > li:eq(" + index + ")", wizard).addClass("disabled");
            }
        });

        updateStepClasses(wizard, startIndex);

        state.currentIndex = startIndex;
        state.currentStep = getStepProperties(wizard, state.currentIndex);

        if (options.enablePagination)
        {
            var actionCollection = $(document.createElement("ul")),
                actionWrapper = $(document.createElement(options.actionContainerTag))
                    .addClass("actions").append(actionCollection);
            wizard.append(actionWrapper);

            if (!options.forceMoveForward)
            {
                actionCollection.append($("<li><a href=\"#previous\">" + options.labels.previous + "</a></li>"));
            }

            actionCollection.append($("<li><a href=\"#next\">" + options.labels.next + "</a></li>"));

            if (options.enableFinishButton)
            {
                actionCollection.append($("<li><a href=\"#finish\">" + options.labels.finish + "</a></li>"));
            }

            refreshActionState(wizard);
            loadAsyncContent(wizard);
        }
    }

    /**
     * Transforms the title to a step item button.
     *
     * @static
     * @private
     * @param wizard {Object} A jQuery wizard object
     * @param header {Object} A jQuery header object
     * @param index {Integer} The position of the header
     */
    function transformTitle(wizard, header, index)
    {
        header.attr("id", getUniqueId(wizard) + "-" + index).attr("tabindex", "-1").addClass("title");

        var options = wizard.data("options"),
            state = wizard.data("state"),
            stepCollection = $(".steps > ol", wizard),
            title = renderTemplate(options.titleTemplate, {
                index: index + 1,
                title: header.html()
            }),
            stepItem = $("<li></li>").html("<a href=\"#" + header.attr("id") + "\">" + title + "</a>");

        if (index === 0)
        {
            stepCollection.prepend(stepItem);
        }
        else
        {
            $("li:eq(" + (index - 1) + ")", stepCollection).after(stepItem);
        }

        // Set the "first" class to the new first step button
        if (index === 0)
        {
            $("li", stepCollection).removeClass("first").eq(index).addClass("first");
        }

        // Set the "last" class to the new last step button
        if (index === (state.stepCount - 1))
        {
            $("li", stepCollection).removeClass("last").eq(index).addClass("last");
        }
    }

    /**
     * Loads and includes async content.
     *
     * @static
     * @private
     * @method loadAsyncContent
     * @param wizard {Object} A jQuery wizard object
     */
    function loadAsyncContent(wizard)
    {
        var options = wizard.data("options"),
            state = wizard.data("state");

        if (!options.enableContentCache || !state.currentStep.contentLoaded)
        {
            switch (getValidEnumValue($.fn.steps.contentMode, state.currentStep.contentMode))
            {
                case $.fn.steps.contentMode.iframe:
                    $(".content > .body", wizard).eq(state.currentIndex).empty()
                        .html($("<iframe src=\"" + state.currentStep.contentUrl + "\" />"))
                        .data("loaded", "1");
                    break;

                case $.fn.steps.contentMode.async:
                    var currentStepContent = $(".content > .body", wizard).eq(state.currentIndex)
                        .empty().append(renderTemplate(options.loadingTemplate, { text: options.labels.loading }));
                    $.ajax({ url: state.currentStep.contentUrl, cache: false })
                        .done(function (data)
                        {
                            currentStepContent.empty().html(data).data("loaded", "1");
                        });
                    break;
            }
        }
    }

    /**
     * Updates step buttons and their related titles beyond a certain position.
     *
     * @static
     * @private
     * @method updateSteps
     * @param wizard {Object} A jQuery wizard object
     * @param index {Integer} The start point for updating ids
     */
    function updateSteps(wizard, index)
    {
        var options = wizard.data("options");

        for (var i = index; i < wizard.data("state").stepCount; i++)
        {
            var title = $(".content > .title:eq(" + i + ")", wizard).attr("id", getUniqueId(wizard) + "-" + i);
            $(".steps > ol > li:eq(" + i + ") > a", wizard).attr("href", "#" + getUniqueId(wizard) + "-" + i)
                .html(renderTemplate(options.titleTemplate, { index: i + 1, title: title.html() }));
        }
    }

    /**
     * Updates step classes after initialization or step changing.
     *
     * @static
     * @private
     * @method updateStepClasses
     * @param wizard {Object} A jQuery wizard object
     * @param index {Integer} The index of the new current step
     * @param [oldIndex] {Integer} The index of the prior step
     */
    function updateStepClasses(wizard, index, oldIndex)
    {
        var options = wizard.data("options"),
            steps = $(".steps li", wizard),
            currentOrNewStep = steps.eq(index),
            currentInfo = $("<span class=\"current-info\">" + options.labels.current + " </span>"),
            stepTitles = $(".content > .title", wizard);

        if (oldIndex != null)
        {
            var oldStep = steps.eq(oldIndex).addClass("done").removeClass("current error");
            stepTitles.eq(oldIndex).removeClass("current").next(".body").removeClass("current");
            currentInfo = $("a > .current-info", oldStep);
            currentOrNewStep.children("a").focus();
        }

        currentOrNewStep.addClass("current").removeClass("disabled done").children("a").prepend(currentInfo);
        stepTitles.eq(index).addClass("current").next(".body").addClass("current");
    }

    /**
     * Refreshs the visualization for the complete action navigation.
     *
     * @static
     * @private
     * @method refreshActionState
     * @param wizard {Object} A jQuery wizard object
     */
    function refreshActionState(wizard)
    {
        var options = wizard.data("options"),
            state = wizard.data("state");

        if (options.enablePagination)
        {
            var finish = $(".actions a[href$='#finish']", wizard).parent(),
                next = $(".actions a[href$='#next']", wizard).parent();

            if (!options.forceMoveForward)
            {
                var previous = $(".actions a[href$='#previous']", wizard).parent();
                if (state.currentIndex > 0)
                {
                    previous.removeClass("disabled");
                }
                else
                {
                    previous.addClass("disabled");
                }
            }

            if (options.enableFinishButton && options.showFinishButtonAlways)
            {
                if (state.stepCount === 0)
                {
                    finish.addClass("disabled");
                    next.addClass("disabled");
                }
                else if (state.stepCount > 1 && state.stepCount > (state.currentIndex + 1))
                {
                    finish.removeClass("disabled");
                    next.removeClass("disabled");
                }
                else
                {
                    finish.removeClass("disabled");
                    next.addClass("disabled");
                }
            }
            else
            {
                if (state.stepCount === 0)
                {
                    finish.hide();
                    next.show().addClass("disabled");
                }
                else if (state.stepCount > (state.currentIndex + 1))
                {
                    finish.hide();
                    next.show().removeClass("disabled");
                }
                else if (!options.enableFinishButton)
                {
                    next.addClass("disabled");
                }
                else
                {
                    finish.show();
                    next.hide().addClass("disabled");
                }
            }
        }
    }

    /**
     * Renders a template and replaces all placeholder.
     *
     * @static
     * @private
     * @method renderTemplate
     * @param template {String} A template
     * @param substitutes {Object} A list of substitute
     * @return {String} The rendered template
     */
    function renderTemplate(template, substitutes)
    {
        var matches = template.match(/#([a-z]*)#/gi);

        for (var i = 0; i < matches.length; i++)
        {
            var match = matches[i], 
                key = match.substring(1, match.length - 1);
            template = template.replace(match, getSubstitute(substitutes, key));
        }

        return template;
    }

    /**
     * Gets a substitute by key.
     *
     * @static
     * @private
     * @method getSubstitute
     * @param substitutes {Object} A list of substitute
     * @param key {String} The key to look for
     * @return {String} A suitable substitute
     */
    function getSubstitute(substitutes, key)
    {
        if (substitutes[key] === undefined)
        {
            throw new Error("The key \"" + key + "\" does not exist in the substitute collection!");
        }

        return substitutes[key];
    }

    /**
     * Gets a step by an given index.
     *
     * @static
     * @private
     * @method getStepProperties
     * @param wizard {Object} A jQuery wizard object  
     * @param index {Integer} The position (zero-based) of a step
     * @return {Object} Returns a step object
     */
    function getStepProperties(wizard, index)
    {
        var options = wizard.data("options"),
            header = $(".content > .title:eq(" + index + ")", wizard),
            content = header.next(".body"),
            mode = (content.data("mode") == null) ? $.fn.steps.contentMode.html :
                getValidEnumValue($.fn.steps.contentMode, (/^\s*$/.test(content.data("mode")) || isNaN(content.data("mode"))) ? 
                    content.data("mode") : parseInt(content.data("mode"), 0)),
            contentUrl = (mode === $.fn.steps.contentMode.html || content.data("url") === undefined) ?
                "" : content.data("url"),
            contentLoaded = (mode !== $.fn.steps.contentMode.html && content.data("loaded") === "1");

        return {
            title: header.html(),
            content: (mode === $.fn.steps.contentMode.html) ? content.html() : "",
            contentUrl: contentUrl,
            contentMode: mode,
            contentLoaded: contentLoaded
        };
    }

    /**
     * Gets a valid enum value by checking a specific enum key or value.
     * 
     * @static
     * @private
     * @method getValidEnumValue
     * @param enumType {Object} Type of enum
     * @param keyOrValue {Object} Key as `String` or value as `Integer` to check for
     */
    function getValidEnumValue(enumType, keyOrValue)
    {
        validateArgument("enumType", enumType);
        validateArgument("keyOrValue", keyOrValue);

        // Is key
        if (typeof keyOrValue === "string")
        {
            var value = enumType[keyOrValue];
            if (value === undefined)
            {
                throw new Error("The enum key \"" + keyOrValue + "\" does not exist.");
            }

            return value;
        }
        // Is value
        else if (typeof keyOrValue === "number")
        {
            for (var key in enumType)
            {
                if (enumType[key] === keyOrValue)
                {
                    return keyOrValue;
                }
            }

            throw new Error("Invalid enum value \"" + keyOrValue + "\".");
        }
        // Type is not supported
        else
        {
            throw new Error("Invalid key or value type.");
        }
    }

    /**
     * Checks an argument for null or undefined and throws an error if one check applies.
     *
     * @static
     * @private
     * @method validateArgument
     * @param argumentName {String} The name of the given argument
     * @param argumentValue {Object} The argument itself
     */
    function validateArgument(argumentName, argumentValue)
    {
        if (argumentValue == null)
        {
            throw new Error("The argument \"" + argumentName + "\" is null or undefined.");
        }
    }

    /**
     * Creates an unique id and adds this to the corresponding wizard instance.
     *
     * @static
     * @private
     * @method createUniqueId
     * @param wizard {Object} A jQuery wizard object
     */
    function createUniqueId(wizard)
    {
        if (wizard.data("uid") === undefined)
        {
            wizard.data("uid", "steps-uid-".concat(++_uniqueId));
        }
    }

    /**
     * Retrieves the unique id from the given wizard instance.
     *
     * @static
     * @private
     * @method getUniqueId
     * @param wizard {Object} A jQuery wizard object
     * @return {String} Returns the unique id for the given wizard
     */
    function getUniqueId(wizard)
    {
        return wizard.data("uid");
    }

    /**
     * Gets the step position (zero-based) by the given step anchor DOM element.
     *
     * @static
     * @private
     * @method getStepPosition
     * @param anchor {Object} The step anchor DOM element
     * @return {String} Returns the step position
     */
    function getStepPosition(anchor)
    {
        return parseInt(anchor.attr("href").substring(anchor.attr("href").lastIndexOf("-") + 1), 0);
    }

    /**
     * Saves the state for a step by its given unique id.
     *
     * @static
     * @private
     * @method saveStateToCookie
     * @param wizard {Object} A jQuery wizard object
     * @param index {Integer} The position (zero-based) to be saved
     */
    function saveStateToCookie(wizard, index)
    {
        var options = wizard.data("options");
        if (options.saveState && $.cookie)
        {
            $.cookie(_cookiePrefix + getUniqueId(wizard), index);
        }
    }

    /**
     * Handles the keyup DOM event.
     *
     * @static
     * @private
     * @event keyup
     * @param event {Object} An event object
     */
    function keyUpHandler(event)
    {
        var wizard = $(this);
        if (wizard.data("options").suppressPaginationOnFocus && $(":focus", wizard).is(":input"))
        {
            event.preventDefault();
            return false;
        }

        var keyCodes = { left: 37, right: 39 };
        if (event.keyCode === keyCodes.left)
        {
            event.preventDefault();
            wizard.steps("previous");
        }
        else if (event.keyCode === keyCodes.right)
        {
            event.preventDefault();
            wizard.steps("next");
        }
    }

    /**
     * Fires when a action click happens.
     *
     * @static
     * @private
     * @event click
     * @param event {Object} An event object
     */
    function actionClickHandler(event)
    {
        event.preventDefault();

        var anchor = $(this),
            wizard = anchor.parents(":has(.steps)"),
            href = anchor.attr("href");
        switch (href.substring(href.lastIndexOf("#")))
        {
            case "#finish":
                wizard.steps("finish");
                break;

            case "#next":
                wizard.steps("next");
                break;

            case "#previous":
                wizard.steps("previous");
                break;
        }
    }

    /**
     * Fires when a step click happens.
     *
     * @static
     * @private
     * @event click
     * @param event {Object} An event object
     */
    function stepClickHandler(event)
    {
        event.preventDefault();

        var anchor = $(this),
            wizard = anchor.parents(":has(.steps)"),
            state = wizard.data("state"),
            oldIndex = state.currentIndex;

        if (anchor.parent().is(":not(.disabled):not(.current)"))
        {
            goToStep(wizard, getStepPosition(anchor));
        }

        // If nothing has changed
        if (oldIndex === state.currentIndex)
        {
            $(".steps a[href$=-" + oldIndex + "]", wizard).focus();
            return false;
        }
    }
})(jQuery);