// Sample data for the seed script.
//
// ⚠️ EVERYTHING HERE IS FICTIONAL.
//  - Phone numbers use the 0800 prefix (toll-free numbers, which are never
//    given to mobile subscribers), so no real person's number is ever shown
//    as a "scammer".
//  - Emails use the reserved ".test" domain, which can never receive mail.
//  - Bank account numbers start with 900000, so they're clearly fake.
//  - Street names are real; house numbers are made up.
//
// Rents are rough 2026 yearly prices in naira, as [min, max] per property type.

const AREAS = [
  {
    area: 'Yaba',
    lga: 'Lagos Mainland',
    state: 'Lagos',
    center: [3.3792, 6.5095], // [longitude, latitude]
    streets: ['Herbert Macaulay Way', 'Commercial Avenue', 'Alagomeji Street', 'Akoka Road', 'Sabo Road'],
    rents: {
      'self-contain': [700000, 1100000],
      'mini-flat': [1200000, 1800000],
      '1-bedroom': [1500000, 2200000],
      '2-bedroom': [2500000, 3800000],
      '3-bedroom': [3500000, 5000000],
    },
    serviceCharge: [0, 150000],
  },
  {
    area: 'Lekki Phase 1',
    lga: 'Eti-Osa',
    state: 'Lagos',
    center: [3.4723, 6.4474],
    streets: ['Admiralty Way', 'Fola Osibo Road', 'Kusenla Road', 'Babatunde Anjous Street', 'Freedom Way'],
    rents: {
      'self-contain': [1200000, 1800000],
      'mini-flat': [2200000, 3200000],
      '1-bedroom': [2500000, 3800000],
      '2-bedroom': [4500000, 7500000],
      '3-bedroom': [7000000, 12000000],
      duplex: [12000000, 25000000],
    },
    serviceCharge: [300000, 1200000],
  },
  {
    area: 'Ikeja',
    lga: 'Ikeja',
    state: 'Lagos',
    center: [3.3515, 6.6018],
    streets: ['Allen Avenue', 'Opebi Road', 'Toyin Street', 'Oba Akran Avenue', 'Joel Ogunnaike Street'],
    rents: {
      'self-contain': [800000, 1200000],
      'mini-flat': [1400000, 2000000],
      '1-bedroom': [1600000, 2400000],
      '2-bedroom': [2800000, 4500000],
      '3-bedroom': [4000000, 6500000],
      duplex: [8000000, 12000000],
    },
    serviceCharge: [50000, 300000],
  },
  {
    area: 'Surulere',
    lga: 'Surulere',
    state: 'Lagos',
    center: [3.3534, 6.4969],
    streets: ['Adeniran Ogunsanya Street', 'Bode Thomas Street', 'Ojuelegba Road', 'Aguda Road', 'Akerele Street'],
    rents: {
      'self-contain': [600000, 900000],
      'mini-flat': [1000000, 1500000],
      '1-bedroom': [1200000, 1700000],
      '2-bedroom': [1800000, 2800000],
      '3-bedroom': [2500000, 3800000],
    },
    serviceCharge: [0, 100000],
  },
  {
    area: 'Gwarinpa',
    lga: 'Abuja Municipal',
    state: 'FCT',
    center: [7.4042, 9.1099],
    streets: ['1st Avenue', '3rd Avenue', '6th Avenue', '69 Road', '33 Crescent'],
    rents: {
      'self-contain': [600000, 1000000],
      'mini-flat': [1000000, 1500000],
      '1-bedroom': [1200000, 1800000],
      '2-bedroom': [2000000, 3500000],
      '3-bedroom': [3000000, 5000000],
      duplex: [6000000, 10000000],
    },
    serviceCharge: [50000, 300000],
  },
  {
    area: 'Wuse 2',
    lga: 'Abuja Municipal',
    state: 'FCT',
    center: [7.47, 9.079],
    streets: ['Aminu Kano Crescent', 'Adetokunbo Ademola Crescent', 'Gimbiya Street', 'Monrovia Street', 'Lobito Crescent'],
    rents: {
      'mini-flat': [2000000, 3000000],
      '1-bedroom': [2500000, 4000000],
      '2-bedroom': [4000000, 6500000],
      '3-bedroom': [6000000, 9000000],
      duplex: [10000000, 18000000],
    },
    serviceCharge: [300000, 800000],
  },
];

const AMENITIES = [
  'prepaid meter', 'borehole', '24/7 security', 'parking space', 'tiled floors',
  'POP ceiling', 'fitted kitchen', 'wardrobes', 'gated compound',
  'generator backup', 'water heater', 'inverter-ready', 'CCTV', 'ensuite rooms',
];

// Every seeded account uses this password
const SEED_PASSWORD = 'Password123';

const TENANTS = [
  { name: 'Chiamaka Okafor', email: 'chiamaka@rentright.test', phone: '08000000201' },
  { name: 'Emeka Nwosu', email: 'emeka@rentright.test', phone: '08000000202' },
  { name: 'Funke Adeyemi', email: 'funke@rentright.test', phone: '08000000203' },
  { name: 'Ibrahim Musa', email: 'ibrahim@rentright.test', phone: '08000000204' },
  { name: 'Ngozi Eze', email: 'ngozi@rentright.test', phone: '08000000205' },
  { name: 'Tolu Bakare', email: 'tolu@rentright.test', phone: '08000000206' },
];

// Agents and landlords WITH accounts. `regions` = the areas they work in.
const AGENT_USERS = [
  { name: 'Segun Alabi', email: 'segun.agent@rentright.test', phone: '08000000301', verified: true, regions: ['Yaba', 'Surulere'] },
  { name: 'Adaeze Uche', email: 'adaeze.agent@rentright.test', phone: '08000000302', verified: true, regions: ['Lekki Phase 1', 'Ikeja'] },
  { name: 'Musa Danladi', email: 'musa.agent@rentright.test', phone: '08000000303', verified: false, regions: ['Gwarinpa', 'Wuse 2'] },
];

const LANDLORD_USERS = [
  { name: 'Olumide Bankole', email: 'olumide.landlord@rentright.test', phone: '08000000401', verified: true, regions: ['Yaba', 'Ikeja', 'Lekki Phase 1'] },
  { name: 'Aisha Bello', email: 'aisha.landlord@rentright.test', phone: '08000000402', verified: true, regions: ['Gwarinpa', 'Wuse 2'] },
];

// Profiles that exist without an account (tenants reviewed them first)
const UNCLAIMED_AGENTS = [
  { name: 'Kunle Properties', phone: '08000000351', regions: ['Yaba', 'Surulere', 'Ikeja'] },
  { name: 'Blessing Homes Abuja', phone: '08000000352', regions: ['Gwarinpa', 'Wuse 2'] },
  { name: 'Lekki Prime Realtors', phone: '08000000353', regions: ['Lekki Phase 1'] },
];

const UNCLAIMED_LANDLORDS = [
  { name: 'Felix Okon', phone: '08000000451', regions: ['Surulere', 'Yaba'] },
  { name: 'Grace Adebayo', phone: '08000000452', regions: ['Lekki Phase 1', 'Ikeja'] },
  { name: 'Yakubu Garba', phone: '08000000453', regions: ['Gwarinpa'] },
];

// Review texts grouped by target and tone. Ratings in the seed script are
// picked to match the tone.
const REVIEW_TEXTS = {
  property: {
    good: [
      'Light is fairly steady here, we get about 18 hours on Band A. Borehole water is clean and the compound is quiet at night.',
      'Very well maintained building. The security man is always at the gate and the drainage works even in heavy rain.',
      'Spacious rooms and the prepaid meter means no fights over NEPA bills. Would rent here again.',
    ],
    mixed: [
      'The apartment itself is nice but light is poor, maybe 8 hours a day. Generator is shared and only runs in the evening.',
      'Water pressure is weak on the top floor so we buy water in the dry season. Otherwise the area is calm.',
      'Good location close to the main road, but the gutter in front gets blocked and smells during rainy season.',
    ],
    bad: [
      'The street floods every time it rains heavily. Water entered the living room twice in July. Be careful.',
      'Light is terrible and the borehole broke down for three weeks. Nobody came to fix it until we contributed money.',
    ],
  },
  agent: {
    good: [
      'Very honest agent. Showed me five places in one day and did not add any hidden fees on top of what was agreed.',
      'Responded quickly on WhatsApp, inspection was free, and the agreement was ready the same day we paid.',
    ],
    mixed: [
      'Helpful but always late for inspections. The agent fee was negotiable which was nice.',
      'Found me a good flat, but kept pushing me to pay before I had seen the landlord or any documents.',
    ],
    bad: [
      'Charged an inspection fee and then showed me apartments that were completely different from the pictures.',
      'Collected agreement and legal fee but never gave me a copy of the agreement. Stopped picking calls afterwards.',
    ],
  },
  landlord: {
    good: [
      'Respectful landlord who fixes things quickly. Refunded my full caution fee within a week of moving out.',
      'Does not disturb tenants, gives notice before visiting, and kept the rent the same at renewal.',
    ],
    mixed: [
      'Generally fine but increased the rent by 30% at renewal with only one month notice.',
      'Repairs take a long time but he eventually does them. Caution was refunded minus "painting fee".',
    ],
    bad: [
      'Refused to refund my caution deposit and claimed damage that was already there when I moved in.',
      'Comes to the compound unannounced and shouts at tenants. Threatened to lock my door when rent was one week late.',
    ],
  },
};

const REPLY_TEXTS = [
  'Thank you for the feedback. We have spoken to the facility manager and the issue has been fixed.',
  'Thanks for renting with us. Please call the office if anything else comes up.',
  'We are sorry about your experience. The deductions were for repainting as stated in the tenancy agreement.',
];

// Fictional scam reports. Names are aliases scammers typically use.
const SCAM_REPORTS = [
  {
    status: 'confirmed',
    name: 'Barrister Kelvin Homes',
    phone: '08000000901',
    accountNumber: '9000000001',
    bankName: 'Opay',
    description: 'Posted a 2-bedroom in Lekki on Instagram for half the normal price. Asked for inspection fee and "holding deposit" of ₦250,000 to an Opay account, then blocked me.',
  },
  {
    status: 'confirmed',
    name: 'Mama Tobi Properties',
    phone: '08000000902',
    accountNumber: '9000000002',
    bankName: 'Palmpay',
    description: 'Showed us a flat in Yaba that she did not own. Collected rent and agent fee from three different people for the same apartment.',
  },
  {
    status: 'confirmed',
    name: 'Engr. Bayo Estates',
    phone: '08000000903',
    accountNumber: '9000000003',
    bankName: 'Moniepoint',
    description: 'Fake caretaker in Surulere. Gave us keys to an empty flat, collected one year rent, and the real landlord showed up two days later.',
  },
  {
    status: 'confirmed',
    name: 'Abuja Cheap Apartments',
    phone: '08000000904',
    accountNumber: '9000000004',
    bankName: 'Access Bank',
    description: 'Facebook page advertising Gwarinpa mini-flats. Insisted on full payment before inspection "because many people want it". Nothing exists at the address.',
  },
  {
    status: 'confirmed',
    name: 'Chinedu Realty Hub',
    phone: '08000000905',
    bankName: 'GTBank',
    accountNumber: '9000000005',
    description: 'Collected ₦50,000 inspection and form fee in Ikeja, then said the flat was taken and refused to refund.',
  },
  {
    status: 'pending',
    name: 'Prime Lettings Wuse',
    phone: '08000000906',
    accountNumber: '9000000006',
    bankName: 'Kuda',
    description: 'Asked me to pay a refundable deposit before showing the apartment in Wuse 2. Still waiting for refund after three weeks.',
  },
  {
    status: 'pending',
    phone: '08000000907',
    description: 'This number called claiming to be my landlord\'s new agent and asked me to pay rent to a different account.',
  },
  {
    status: 'rejected',
    name: 'Kunle Properties',
    phone: '08000000351',
    description: 'He did not refund my inspection fee after I decided not to take the flat. (Rejected: inspection fees are disclosed upfront.)',
  },
];

module.exports = {
  AREAS,
  AMENITIES,
  SEED_PASSWORD,
  TENANTS,
  AGENT_USERS,
  LANDLORD_USERS,
  UNCLAIMED_AGENTS,
  UNCLAIMED_LANDLORDS,
  REVIEW_TEXTS,
  REPLY_TEXTS,
  SCAM_REPORTS,
};
