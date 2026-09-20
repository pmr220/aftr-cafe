/* AFTR HOME REVIEWS
   Replace the entries below with the exact customer review text supplied by AFTR.
   No review wording is invented here.
*/

const AFTR_GOOGLE_REVIEWS_URL = 'https://share.google/9luRFC4YHx65Wfd2a';

const AFTR_REVIEWS = [
  {
    text: 'Really loved my experience at Aftr Cafe. The ambience is cozy and aesthetic, the food was delicious, and the drinks were great too. The staff was friendly and the service was quick. Perfect place to chill with friends. Will definitely visit again!',
    author: 'Muskan',
    rating: 5
  },
  {
    text: 'Without a doubt, they serve the finest coffee in town! The owners warm and welcoming personality, combined with expert coffee knowledge, makes every visit special. It is truly worth every penny. Dont miss out on this gem. Make sure to give it a try and experience it for yourself!',
    author: 'Venkatesh Rathod',
    rating: 5
  },
  {
    text: '"Had a great experience at Aftr! The coffee was truly authentic and full of flavor. You can tell they pay attention to quality, from the aroma to the taste. Every sip was smooth, rich, and perfectly balanced. The taste was absolutely top-notch, and the overall vibe of the cafe made the experience even better. Definitely a place I did recommend to anyone who appreciates good coffee. Looking forward to visiting again!"',
    author: 'Shifah',
    rating: 5
  },
  {
    text: 'If you are looking for a spot with great energy and beautiful decor, this is it. The atmosphere is very relaxing and well-designed. Beyond the looks, the food was delicious and served with a smile. The service was quick and professional. A 5-star experience all the way',
    author: 'Darshan',
    rating: 5
  },
  {
    text: 'Overall, we had a good experience at Aftr Cafe. The ambience is pleasant, and one thing we really liked was that they have board games and card games, which makes it a fun place to spend time with family and friends.',
    author: 'CA Purvesh Rathi',
    rating: 5
  }
];

(() => {

  const rail = document.querySelector('#homeReviewsTrack');

  if (!rail) {
    return;
  }

  const escapeHtml = value =>
    String(value ?? '').replace(
      /[&<>"']/g,
      ch => ({
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#039;'
      }[ch])
    );


  const clean = AFTR_REVIEWS.filter(review =>
    review &&
    review.text &&
    !String(review.text).includes('PASTE ACTUAL')
  );


  const data = clean.length
    ? clean
    : [
        {
          text: 'Customer reviews will be shown here once the exact Google review wording is added.',
          author: 'AFTR / Google Reviews',
          rating: 5
        }
      ];


  data.forEach((review, index) => {

    const card = document.createElement('article');

    card.className = 'review-card';


    const rating = Math.max(
      1,
      Math.min(
        5,
        Number(review.rating) || 5
      )
    );


    const stars =
      '★'.repeat(rating) +
      '☆'.repeat(5 - rating);


    card.innerHTML = `
      <div class="review-card-top">

        <span class="review-number">
          ${String(index + 1).padStart(2, '0')} / GOOGLE REVIEW
        </span>

        <span class="review-stars">
          ${stars}
        </span>

      </div>

      <p class="review-text">
        “${escapeHtml(review.text)}”
      </p>

      <div class="review-author">
        ${escapeHtml(review.author)} · Google
      </div>
    `;


    rail.appendChild(card);

  });


  /*
    Desktop mouse drag.
    Touch devices already get native horizontal swiping.
  */

  let down = false;
  let startX = 0;
  let startScroll = 0;


  rail.addEventListener('mousedown', event => {

    down = true;

    startX = event.pageX - rail.offsetLeft;

    startScroll = rail.scrollLeft;

  });


  window.addEventListener('mouseup', () => {

    down = false;

  });


  rail.addEventListener('mouseleave', () => {

    down = false;

  });


  rail.addEventListener('mousemove', event => {

    if (!down) {
      return;
    }

    event.preventDefault();

    const x = event.pageX - rail.offsetLeft;

    rail.scrollLeft =
      startScroll -
      ((x - startX) * 1.1);

  });

})();