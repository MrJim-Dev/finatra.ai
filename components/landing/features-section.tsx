import {
  BellIcon,
  CalendarIcon,
  FileTextIcon,
  GlobeIcon,
  InputIcon,
} from '@radix-ui/react-icons';

import { BentoCard, BentoGrid } from '@/components/magicui/bento-grid';

const features = [
  {
    Icon: FileTextIcon,
    name: 'User Feedback Collection',
    description:
      'Easily gather and prioritize user feedback through a streamlined feature request system.',
    href: '/',
    cta: 'Learn more about Featurize',
    background: <img className="absolute -right-20 -top-20 opacity-60" />,
    className: 'lg:row-start-1 lg:row-end-4 lg:col-start-2 lg:col-end-3',
  },
  {
    Icon: InputIcon,
    name: 'Customizable Pages',
    description:
      'Personalize your feature request page to reflect your brand identity and engage users effectively.',
    href: '/',
    cta: 'Learn more about Featurize',
    background: <img className="absolute -right-20 -top-20 opacity-60" />,
    className: 'lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-3',
  },
  {
    Icon: GlobeIcon,
    name: 'Transparent Upvoting',
    description:
      'Empower your users to influence product development through a transparent upvoting system.',
    href: '/',
    cta: 'Learn more about Featurize',
    background: <img className="absolute -right-20 -top-20 opacity-60" />,
    className: 'lg:col-start-1 lg:col-end-2 lg:row-start-3 lg:row-end-4',
  },
  {
    Icon: CalendarIcon,
    name: 'Engagement Insights',
    description:
      'Utilize user comments and upvotes to gain insights and make data-driven decisions.',
    href: '/',
    cta: 'Learn more about Featurize',
    background: <img className="absolute -right-20 -top-20 opacity-60" />,
    className: 'lg:col-start-3 lg:col-end-3 lg:row-start-1 lg:row-end-2',
  },
  {
    Icon: BellIcon,
    name: 'Seamless Integration',
    description:
      'Embed the feature request form directly into your platform for a seamless user experience.',
    href: '/',
    cta: 'Learn more about Featurize',
    background: <img className="absolute -right-20 -top-20 opacity-60" />,
    className: 'lg:col-start-3 lg:col-end-3 lg:row-start-2 lg:row-end-4',
  },
];

export async function FeaturesSection() {
  return (
    <section
      id="features"
      className="text-center mx-auto max-w-[80rem] px-6 md:px-8"
    >
      <div className="py-14">
        <div className="mx-auto max-w-5xl text-center mb-14">
          <h4 className="text-xl font-bold tracking-tight text-black dark:text-white">
            Features
          </h4>

          <h2 className="text-5xl font-bold tracking-tight text-black dark:text-white sm:text-6xl">
            Empower Your Product Development
          </h2>

          <p className="mt-6 text-xl leading-8 text-black/80 dark:text-white">
            Discover how Featurize can transform your user feedback process and
            enhance your product offerings.
          </p>
        </div>

        <BentoGrid className="lg:grid-rows-3">
          {features.map((feature) => (
            <BentoCard key={feature.name} {...feature} />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}
