import * as React from "react"
import Svg, { Path, Shape, SvgProps } from "react-native-svg"
const SvgComponent = (props: any) => (
  <Svg xmlns="http://www.w3.org/2000/svg" width={450} height={900} {...props}>
    <Path fill="#fff" d="M0 0h450v900H0z" />
    <Path
      fill="#abbfb7"
      d="M450 405c-46-31.1-92-62.2-131.3-88.1-39.2-25.9-71.6-46.5-115.5-70.1-43.8-23.6-99.1-50.2-127.4-91.8C47.6 113.4 46.3 56.7 45 0h405Z"
    />
    <Path
      fill="#5c8374"
      d="M450 202.5c-23-15.6-46-31.1-65.6-44.1-19.6-12.9-35.9-23.2-57.8-35s-49.5-25.1-63.7-45.9C248.8 56.7 248.1 28.3 247.5 0H450Z"
    />
    <Path
      fill="#abbfb7"
      d="M0 495c57.4 1.6 114.7 3.2 155 30.8 40.3 27.7 63.5 81.4 98.9 120.3 35.3 39 82.9 63.3 110.1 103.1 27.2 39.9 34.1 95.3 41 150.8H0Z"
    />
    <Path
      fill="#5c8374"
      d="M0 697.5c28.7.8 57.4 1.6 77.5 15.4s31.7 40.7 49.4 60.2 41.5 31.6 55.1 51.5c13.6 19.9 17.1 47.7 20.5 75.4H0Z"
    />
  </Svg>
)
export default SvgComponent
