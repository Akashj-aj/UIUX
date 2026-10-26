import * as LucideIcons from 'lucide-react';

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  color?: string;
}

export default function Icon({ name, size = 18, className, color }: IconProps) {
  const IconComponent = (LucideIcons as any)[name];
  if (!IconComponent) {
    return <LucideIcons.Circle size={size} className={className} color={color} />;
  }
  return <IconComponent size={size} className={className} color={color} />;
}
