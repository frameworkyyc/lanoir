/**
 * Copy for /divination: CONFIRMED CONTENT ONLY, supplied by the client. One source for the page, its
 * metadata and the tests. Do not add prices, durations, locations, booking claims, qualifications,
 * credentials or years of experience unless the client supplies them.
 */
export interface DivinationService { key: 'lenormand' | 'mediumship'; title: string; paragraphs: string[]; /** Decorative timeline labels (from the existing copy: next three months, six-to-nine-month outlook). */ timeline?: [string, string] }
export interface EthicsGroup { title: string; items: string[] }

const intro =
  'Intuitive readings for clarity, reflection and guidance through Lenormand, pendulum dowsing, mediumship and spirit scribing.';

export const divination = {
  title: 'Divination by LaNoir | Love Beyond the Veil',
  /** Same sentence as the hero introduction: only a confirmed claim. */
  description: intro,
  path: '/divination',

  hero: {
    eyebrow: 'Divination by LaNoir',
    headline: 'Love Beyond the Veil.',
    support: 'Where Spirit Speaks and Intuition Leads.',
    intro,
  },

  meet: {
    heading: 'Meet Cindy',
    paragraphs: [
      'My name is Cindy, and I am a spiritual practitioner with a passion for divination, intuitive exploration and the connections that continue beyond this life.',
      'Through Lenormand card readings and pendulum dowsing, I offer insight into life’s questions, explore potential paths ahead and help clients gain a deeper perspective on the months to come.',
      'My practice also extends into mediumship, where I seek to connect with those who have passed and thoughtfully scribe the messages and impressions that come through. These spirit-focused sessions offer a gentle, personal space to explore the possibility of connection, remembrance and the enduring bonds we share with those we love.',
      'Whether you’re seeking clarity about the road ahead or are curious about a connection beyond the physical world, my intention is to provide a welcoming, respectful and meaningful experience guided by intuition, compassion and an open heart.',
    ],
  },

  /** Section has no visible heading in the brief; this names the region for assistive technology only. */
  servicesLabel: 'Services',
  services: [
    {
      key: 'lenormand',
      title: 'Lenormand Readings',
      timeline: ['3 months', '6–9 months'],
      paragraphs: [
        'Using the La Santa Muerte Lenormand deck, intuitive interpretation and pendulum dowsing, I explore themes, circumstances and potential developments over the next three months, with a broader outlook toward the six-to-nine-month period.',
        'During a reading, I interpret the cards in relation to your questions and circumstances, using clarifying questions and pendulum dowsing where appropriate. The reading explores potential paths and developments, offering perspective to help you better understand your circumstances and consider your choices.',
      ],
    },
    {
      key: 'mediumship',
      title: 'Mediumship & Spirit Scribing',
      paragraphs: [
        'Through mediumship, I seek to connect with those who have passed and share the impressions, messages and information that come through.',
        'During these sessions, I use spiritual scribing to record and communicate what I receive. Every experience is different, and while I approach this work with openness and respect, a specific connection or message cannot be guaranteed.',
      ],
    },
  ] satisfies DivinationService[],

  approach: {
    heading: 'A Practice Rooted in Respect',
    lead: 'Each session is approached with honesty, compassion and respect for your personal autonomy. Intuitive impressions are shared as impressions rather than guaranteed facts, and you are always free to accept, question or reject any interpretation.',
    closing: 'Readings explore possibilities. They do not determine your future or replace your own judgment.',
  },

  ethics: {
    /** Decorative subtitle only. This is not a privacy policy and is not labelled as one. */
    eyebrow: 'Sacred Laws',
    heading: 'Ethics & Sacred Practice',
    intro:
      'These principles guide every reading and mediumship session, creating a practice grounded in honesty, consent, confidentiality and respect.',
    groups: [
      {
        title: 'Honesty',
        items: [
          'I describe my abilities, experience and qualifications accurately.',
          'I distinguish intuitive impressions from information I know to be factual.',
          'I acknowledge when a message or interpretation isn’t clear.',
        ],
      },
      {
        title: 'Client Autonomy',
        items: [
          'I don’t tell clients that a reading determines their future.',
          'I respect their right to accept or reject an interpretation.',
          'I don’t pressure people to make major decisions based on a reading.',
        ],
      },
      {
        title: 'Emotional Safety',
        items: [
          'I don’t use frightening predictions to encourage repeat bookings.',
          'I don’t claim that a deceased loved one is angry, trapped or demanding a paid service.',
          'I don’t use a client’s grief or fear to sell additional sessions.',
        ],
      },
      {
        title: 'Confidentiality',
        items: [
          'I keep client information private.',
          'I obtain explicit permission before using testimonials, recordings or session details publicly.',
        ],
      },
      {
        title: 'Professional Boundaries',
        items: [
          'I don’t present readings as substitutes for medical, legal, financial or mental-health advice.',
          'I explain fees, services and cancellation policies before a session begins.',
        ],
      },
    ] satisfies EthicsGroup[],
  },

  closing: {
    headline: 'Love Beyond the Veil.',
    support: 'Where Spirit Speaks and Intuition Leads.',
    enquire: 'Enquire',
  },
};

/**
 * Enlarged pull quote: lifted verbatim from the last "Meet Cindy" paragraph (only the first letter is
 * capitalised), so it can never drift from the biography.
 */
export const meetPullQuote = (() => {
  const last = divination.meet.paragraphs[divination.meet.paragraphs.length - 1];
  const start = last.indexOf('a welcoming');
  const q = last.slice(start);
  return q.charAt(0).toUpperCase() + q.slice(1);
})();
