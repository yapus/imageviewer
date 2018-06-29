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


### LEGAL
Copyright (c) 2018 Iakov Pustilnik

This project is licensed under the terms of the MIT license.

This project uses and is bundled with:
* [d3js](https://github.com/d3/d3) by Mike Bostock (BSD 3-Clause "New" or "Revised" License)
* [imagefilters.js](https://github.com/arahaya/ImageFilters.js) by ARAKI Hayato (MIT License)
