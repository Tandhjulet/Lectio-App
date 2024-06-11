import * as React from "react"
import { ColorValue } from "react-native"
import Svg, { Path } from "react-native-svg"

function SvgComponent({
  style,
  color
}: {
  style: any,
  color: ColorValue
}) {
  return (
    <Svg
      viewBox="0 0 450 900"
      width={450}
      height={900}
      xmlns="http://www.w3.org/2000/svg"
      {...style}
    >
      <Path
        d="M0 418l25-8.8c25-8.9 75-26.5 125-4.2s100 84.7 150 84.7 100-62.4 125-93.5l25-31.2v536H0z"
        fill={color.toString()}
        strokeLinecap="round"
      />
    </Svg>
  )
}

export default SvgComponent
