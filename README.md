Simple htmlwidgets binary format image viewer for R with brightness/contrast filters & svg charts

![imageviewer example](https://github.com/yapus/imageviewer/raw/gh_pages/images/imageviewer_example.png)

example usage:
```R
install.packages(c("devtools"))
devtools::install_github("yapus/imageviewer")
library('imageviewer')
m <- matrix(rnorm(512*512), 512, 512)
imageviewer( m )
```
