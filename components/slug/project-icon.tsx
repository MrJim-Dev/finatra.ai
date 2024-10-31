import Image from 'next/image';
import { capitalizeWords } from '@/lib/utils';

interface ProjectIconProps {
  name: string;
  icon_url?: string | null;
}

export default function ProjectIcon({
  name,
  icon_url = null,
}: ProjectIconProps) {
  return (
    <div
      className={`w-12 h-12 rounded-md flex items-center justify-center overflow-hidden ${icon_url ? '' : 'bg-gray-200'}`}
    >
      {icon_url ? (
        <Image
          src={icon_url}
          alt={name}
          width={48}
          height={48}
          className="object-cover w-full h-full"
          style={{ objectPosition: 'center' }}
        />
      ) : (
        <span className="text-gray-500 text-xl font-bold capitalize">
          {name.split(' ').length > 1
            ? `${name.split(' ')[0].charAt(0)}${name.split(' ')[1].charAt(0)}`
            : name.charAt(0)}
        </span>
      )}
    </div>
  );
}
