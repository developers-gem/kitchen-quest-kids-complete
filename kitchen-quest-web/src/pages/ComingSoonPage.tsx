import { EmptyState } from "../components/EmptyState";

interface ComingSoonPageProps {
  title: string;
  description: string;
}

/** Used for nav destinations not yet built in this phase (Flavor Hub,
 * Games, Recipes, Grocery, Parent Dashboard pages) -- keeps the router
 * complete and every nav link real/navigable rather than a dead link,
 * while being explicit that the page itself is a placeholder, not a
 * finished feature. */
export function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return <EmptyState icon="🚧" title={title} description={description} />;
}
