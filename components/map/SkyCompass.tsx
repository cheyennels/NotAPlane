import { Fonts } from "@/constants/fonts";
import { CelestialBody, celestialBodyColor } from "@/hooks/useCelestialData";
import { Circle, G, Line, Svg, Text as SvgText } from "react-native-svg";

const GOLD = "#FFD700";
const SIZE = 140;
const CENTER = SIZE / 2;
const RING_RADIUS = 52;
const LABEL_RADIUS = 62;

type Props = {
  bodies: CelestialBody[];
};

export default function SkyCompass({ bodies }: Props) {
  return (
    <Svg width={SIZE} height={SIZE}>
      <Circle
        cx={CENTER}
        cy={CENTER}
        r={RING_RADIUS}
        fill="rgba(0,0,0,0.75)"
        stroke="#333"
        strokeWidth={1}
      />

      {[
        { label: "N", x: CENTER, y: 6 },
        { label: "S", x: CENTER, y: SIZE - 4 },
        { label: "E", x: SIZE - 4, y: CENTER + 4 },
        { label: "W", x: 4, y: CENTER + 4 },
      ].map(({ label, x, y }) => (
        <SvgText
          key={label}
          x={x}
          y={y}
          fill="#555"
          fontSize={9}
          fontFamily={Fonts.mono}
          textAnchor="middle"
        >
          {label}
        </SvgText>
      ))}

      <Line
        x1={CENTER}
        y1={CENTER - RING_RADIUS}
        x2={CENTER}
        y2={CENTER - 4}
        stroke="#333"
        strokeWidth={0.5}
      />
      <Line
        x1={CENTER}
        y1={CENTER + 4}
        x2={CENTER}
        y2={CENTER + RING_RADIUS}
        stroke="#333"
        strokeWidth={0.5}
      />
      <Line
        x1={CENTER - RING_RADIUS}
        y1={CENTER}
        x2={CENTER - 4}
        y2={CENTER}
        stroke="#333"
        strokeWidth={0.5}
      />
      <Line
        x1={CENTER + 4}
        y1={CENTER}
        x2={CENTER + RING_RADIUS}
        y2={CENTER}
        stroke="#333"
        strokeWidth={0.5}
      />

      <Circle cx={CENTER} cy={CENTER} r={3} fill={GOLD} opacity={0.6} />

      {bodies.map((body) => {
        const azRad = ((body.azimuth - 90) * Math.PI) / 180;
        const dist = RING_RADIUS * (1 - body.altitude / 90) * 0.9;
        const bx = CENTER + Math.cos(azRad) * dist;
        const by = CENTER + Math.sin(azRad) * dist;

        const ldist = Math.min(dist + 10, LABEL_RADIUS);
        const lx = CENTER + Math.cos(azRad) * ldist;
        const ly = CENTER + Math.sin(azRad) * ldist;

        const color = celestialBodyColor(body.kind);

        return (
          <G key={body.id}>
            <Circle cx={bx} cy={by} r={3} fill={color} opacity={0.9} />
            <SvgText
              x={lx}
              y={ly + 3}
              fill={color}
              fontSize={7}
              fontFamily={Fonts.mono}
              textAnchor="middle"
              opacity={0.9}
            >
              {body.name.toUpperCase()}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}
