#' imageviewer
#'
#' Simple htmlwidgets matrix viewer with WebGL brightness/contrast
#' @param data A matrix
#' @param width,height matrix dimensions
#' @param elementId HTML element Id
#' @param options list of other options (passed through to JS code)
#' @return Plot matrix in html widget
#' @examples
#' # Create matrix
#' m <- matrix(rnorm(512 * 512, mean = 100, sd = 10), 512, 512)
#'
#' # Plot
#' imageviewer(m)
#' @import htmlwidgets
#' @export
imageviewer <- function(data, width = NULL, height = NULL, elementId = NULL, options = list()) {

  # forward options using x
  x = list(
    data = data,
    options = options
  )

  # create widget
  htmlwidgets::createWidget(
    name = 'imageviewer',
    x,
    width = width,
    height = height,
    package = 'imageviewer',
    elementId = elementId
  )
}

#' Shiny bindings for imageviewer
#'
#' Output and render functions for using imageviewer within Shiny
#' applications and interactive Rmd documents.
#'
#' @param outputId output variable to read from
#' @param width,height Must be a valid CSS unit (like \code{'100\%'},
#'   \code{'400px'}, \code{'auto'}) or a number, which will be coerced to a
#'   string and have \code{'px'} appended.
#' @param expr An expression that generates a imageviewer
#' @param env The environment in which to evaluate \code{expr}.
#' @param quoted Is \code{expr} a quoted expression (with \code{quote()})? This
#'   is useful if you want to save an expression in a variable.
#'
#' @name imageviewer-shiny
#'
#' @export
imageviewerOutput <- function(outputId, width = '100%', height = '400px'){
  htmlwidgets::shinyWidgetOutput(outputId, 'imageviewer', width, height, package = 'imageviewer')
}

#' @rdname imageviewer-shiny
#' @export
renderImageviewer <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  htmlwidgets::shinyRenderWidget(expr, imageviewerOutput, env, quoted = TRUE)
}
