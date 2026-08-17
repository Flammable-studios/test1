import {
  Laptop,
  ShoppingBag,
  Snowflake,
  Sparkles,
  Tag,
  Trash2,
  Trees,
  Truck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type CategoryId =
  | "junk"
  | "clean"
  | "yard"
  | "move"
  | "handyman"
  | "snow"
  | "errands"
  | "tech"
  | "other";

export type JobStatus = "open" | "claimed" | "complete";

export interface Category {
  id: CategoryId;
  label: string;
  icon: LucideIcon;
  color: string;
}

export interface Job {
  id: string;
  title: string;
  category: CategoryId;
  price: number;
  location: string;
  note: string;
  status: JobStatus;
  posted: number;
  /** Free-text job type when category is "other". */
  customLabel?: string;
  /** User id of the person who claimed the job. */
  claimedBy?: string;
  claimedAt?: number;
  /** User id of the person who posted the job. */
  postedBy?: string;
  completedAt?: number;
  /** True once the poster has paid to promote this listing. */
  promoted?: boolean;
  promotedAt?: number;
}

export const CATEGORIES: Category[] = [
  { id: "junk", label: "Junk removal", icon: Trash2, color: "#FF5A1F" },
  { id: "clean", label: "Power washing", icon: Sparkles, color: "#2E5F5B" },
  { id: "yard", label: "Yard work", icon: Trees, color: "#5C7A3D" },
  { id: "move", label: "Moving help", icon: Truck, color: "#8A5A2E" },
  { id: "handyman", label: "Handyman", icon: Wrench, color: "#4E7AAC" },
  { id: "snow", label: "Snow removal", icon: Snowflake, color: "#5F8CA0" },
  { id: "errands", label: "Errands", icon: ShoppingBag, color: "#B07A4F" },
  { id: "tech", label: "Tech help", icon: Laptop, color: "#76609F" },
  { id: "other", label: "Other", icon: Tag, color: "#8A7FA0" },
];

export function catInfo(id: CategoryId): Category {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

export const PROMO_PRICE_USD = 5;
export const PROMO_DAYS = 7;

/** Display label for a job — uses the custom type for "Other" jobs. */
export function jobLabel(job: Job): string {
  return job.customLabel?.trim() || catInfo(job.category).label;
}

const MIN = 60_000;

export const SEED: Job[] = [
  {
    id: "seed1",
    title: "Old couch + 2 mattresses gone by tonight",
    category: "junk",
    price: 65,
    location: "Diamond Creek area",
    note: "Curbside, easy load. Need it gone before trash day.",
    status: "open",
    posted: Date.now() - 40 * MIN,
  },
  {
    id: "seed2",
    title: "Driveway + walkway wash, 2-car",
    category: "clean",
    price: 80,
    location: "Sun City",
    note: "Pretty dirty, oil stains near garage.",
    status: "open",
    posted: Date.now() - 120 * MIN,
  },
  {
    id: "seed3",
    title: "Overgrown backyard, need it cut back",
    category: "yard",
    price: 90,
    location: "Woodcreek Oaks",
    note: "Waist-high weeds, small trailer of debris after.",
    status: "claimed",
    posted: Date.now() - 200 * MIN,
  },
  {
    id: "seed4",
    title: "Fix wobbly porch railing + replace hinge",
    category: "handyman",
    price: 95,
    location: "Ridgeview area",
    note: "Fans and hinge on hand. Need holes patched after install.",
    status: "open",
    posted: Date.now() - 180 * MIN,
  },
  {
    id: "seed5",
    title: "Shovel driveway + walk for snowstorm",
    category: "snow",
    price: 50,
    location: "Riverbend",
    note: "Snow expected Saturday morning. Salt provided.",
    status: "open",
    posted: Date.now() - 300 * MIN,
  },
  {
    id: "seed6",
    title: "Grocery run + pharmacy pickup",
    category: "errands",
    price: 30,
    location: "Midtown",
    note: "Two stops, about 30 minutes. Receipts paid back.",
    status: "open",
    posted: Date.now() - 50 * MIN,
  },
  {
    id: "seed7",
    title: "Recover photos from dead laptop",
    category: "tech",
    price: 120,
    location: "Creekside",
    note: "Screen won't turn on, hard drive intact. Hoping for family photos.",
    status: "claimed",
    posted: Date.now() - 720 * MIN,
  },
  {
    id: "seed8",
    title: "Walk my dog while I'm at work",
    category: "other",
    customLabel: "Dog walking",
    price: 22,
    location: "Westside",
    note: "Friendly lab mix, 30 min midday walk + fresh water.",
    status: "open",
    posted: Date.now() - 90 * MIN,
  },
];