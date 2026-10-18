function Link({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

/** Who made the things this lab is built on, with links to learn more. */
export function Credits() {
  return (
    <section className="credits">
      <div className="intro">
        <h2>Credits and links</h2>
        <p>
          This lab stands on work shared openly by scientists and engineers. Here's who made what, and where to learn
          more.
        </p>
      </div>

      <div className="callout">
        <h3>The Mothbox</h3>
        <p>
          The Mothbox is an open-source automatic light trap made by <strong>Digital Naturalism Laboratories</strong>{' '}
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
        <h3>The photos our detector learned from</h3>
        <p>
          Our detector practiced on, and the lesson photos come from, the <strong>AMI dataset</strong> from the
          Automated Monitoring of Insects project (Rolnick Lab at Mila and McGill University, with partners around the
          world). Experts drew boxes around the insects in thousands of light-trap photos and shared them for free.
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
        <h3>The AI models in the lesson</h3>
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
            <strong>BioCLIP</strong> by the Imageomics Institute names each moth in step 4, like it does for the Mothbox
            team. It's too big for a browser, so we ran it ahead of time on the lesson photos.{' '}
            <Link href="https://imageomics.github.io/bioclip/">BioCLIP</Link> (MIT license)
          </li>
          <li>
            <strong>FiftyOne</strong> by Voxel51 is the program the Mothbox team uses to check the AI's work.{' '}
            <Link href="https://docs.voxel51.com/">FiftyOne docs</Link>
          </li>
        </ul>
      </div>

      <div className="callout">
        <h3>About this lab</h3>
        <p>
          Made for our FIRST LEGO League team. The lesson photos and the experts' boxes and labels are real, from the
          AMI dataset. All three AIs are real. Our trained YOLO11n finds the insects and our trained moth classifier
          sorts them, right in your browser; neither saw the lesson photos while learning. BioCLIP's species names were
          worked out ahead of time. The lab's code is free to use and change under the AGPL-3.0 license:{' '}
          <Link href="https://github.com/danmartinez78/vision_playground">source code on GitHub</Link>.
        </p>
      </div>
    </section>
  )
}
