function Link({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

/** How the lab was made: where the photos come from, which AIs we trained, and credits. */
export function HowWeMade() {
  return (
    <section className="credits">
      <div className="intro">
        <h2>How we made this site</h2>
        <p>
          Everything in the lesson is real: real insect-monitor photos, real answers from experts, and real AIs. Here's
          where each part came from.
        </p>
      </div>

      <div className="callout">
        <h3>The short version</h3>
        <ol>
          <li>
            <strong>Photos and right answers</strong> come from the AMI project. Experts drew a box around each insect
            and named many of the moths. On the 2 lesson photos, our team checked every spot: one small insect the
            experts skipped got a box, and everything else is not a bug.
          </li>
          <li>
            <strong>We trained two small AIs</strong> on AMI photos: one finds the insects, one sorts each close-up as
            moth or not. They run right in your browser.
          </li>
          <li>
            <strong>We didn't train BioCLIP</strong>, the big AI that names the moths. Other scientists made it. We ran
            it on the lesson photos ahead of time and saved its answers.
          </li>
          <li>
            <strong>The Mothbox</strong> is an open-source insect monitor. Our team learned about it and is designing a
            sensor like it to count pests before and after a treatment. It uses the same steps as this lesson. None of
            the photos or AIs here come from the Mothbox project.
          </li>
        </ol>
      </div>

      <div className="callout">
        <h3>What we trained</h3>
        <p>
          We didn't start from scratch. Each AI started from a free model that had already learned from millions of
          everyday photos, and we taught it insects with the AMI training photos. That's called{' '}
          <strong>fine-tuning</strong>.
        </p>
        <ul>
          <li>
            <strong>The detector</strong> (YOLO11n) learned to put a box around every insect. On the 2 lesson photos it
            finds all 34 insects.
          </li>
          <li>
            <strong>The moth-or-not sorter</strong> (MobileNetV3-small) looks at one close-up at a time and says moth,
            other insect or not a bug.
          </li>
        </ul>
        <p>
          The lesson photos were kept out of training. An AI tested on photos it practiced on would look better than it
          really is.
        </p>
      </div>

      <div className="callout">
        <h3>What other scientists made</h3>
        <p>
          <strong>BioCLIP 2</strong>, from the Imageomics Institute, learned from photos of hundreds of thousands of
          kinds of living things. We gave it the list of moths that live in each photo's region and saved its top
          answers. It's too big to run in a browser, so the lesson shows those saved answers.
        </p>
      </div>

      <div className="callout">
        <h3>Credits: the Mothbox</h3>
        <p>
          The Mothbox is an open-source insect monitor made by <strong>Digital Naturalism Laboratories</strong>{' '}
          (Dinalab). It attracts insects to a lit sheet at night and photographs them, so scientists can count insects
          without catching them. Anyone can build one from the free plans.
        </p>
        <ul>
          <li>
            <Link href="https://mothbox.org/">mothbox.org</Link>: the project's home page and build guides
          </li>
          <li>
            <Link href="https://github.com/Digital-Naturalism-Laboratories/Mothbox">Mothbox on GitHub</Link>: the plans
            and code
          </li>
          <li>
            <Link href="https://www.instructables.com/Mothbox-DIY-Insect-Camera/">Build a Mothbox</Link>: a step-by-step
            guide on Instructables
          </li>
        </ul>
      </div>

      <div className="callout">
        <h3>Credits: the photos and labels</h3>
        <p>
          Our detector practiced on, and the lesson photos come from, the <strong>AMI dataset</strong> from the
          Automated Monitoring of Insects project (Rolnick Lab at Mila and McGill University, with partners around the
          world). Experts drew boxes around the insects in thousands of insect-monitor photos and shared them for free.
        </p>
        <ul>
          <li>
            Jain and others, 2024.{' '}
            <Link href="https://arxiv.org/abs/2406.12452">Insect Identification in the Wild: The AMI Dataset</Link>.
            European Conference on Computer Vision (ECCV).
          </li>
          <li>
            <Link href="https://zenodo.org/records/11358689">Download the AMI dataset</Link> (MIT license)
          </li>
          <li>
            <Link href="https://www.insectmonitoring.org/">insectmonitoring.org</Link>: the project's home page
          </li>
        </ul>
      </div>

      <div className="callout">
        <h3>Credits: the AI models</h3>
        <ul>
          <li>
            <strong>YOLO11</strong> by Ultralytics finds where the insects are. We trained the nano size on the AMI
            photos. <Link href="https://docs.ultralytics.com/models/yolo11/">YOLO11 docs</Link> (AGPL-3.0 license)
          </li>
          <li>
            <strong>MobileNetV3</strong> sorts each close-up as moth or not, like the classifier AMI runs after its
            detector. We trained the small size on close-ups from the AMI photos.{' '}
            <Link href="https://pytorch.org/vision/stable/models/mobilenetv3.html">MobileNetV3 docs</Link>
          </li>
          <li>
            <strong>BioCLIP</strong> by the Imageomics Institute names the moths in the lesson, like it does for the
            Mothbox's makers. It's too big for a browser, so we ran it ahead of time on the lesson photos.{' '}
            <Link href="https://imageomics.github.io/bioclip/">BioCLIP</Link> (MIT license)
          </li>
          <li>
            <strong>FiftyOne</strong> by Voxel51 is the program the Mothbox's makers use to check the AI's work.{' '}
            <Link href="https://docs.voxel51.com/">FiftyOne docs</Link>
          </li>
        </ul>
      </div>

      <div className="callout">
        <h3>About this lab</h3>
        <p>
          Made for our FIRST LEGO League team. The lab's code is free to use and change under the AGPL-3.0 license:{' '}
          <Link href="https://github.com/danmartinez78/vision_playground">source code on GitHub</Link>.
        </p>
      </div>
    </section>
  )
}
