interface Props {
  size?: number;
  className?: string;
  label?: string;
}

export default function OrbitSpinner({ size = 48, className = "", label }: Props) {
  return <div className={className} style={{ width: size, height: size }} />;
}
