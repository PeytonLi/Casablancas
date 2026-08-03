export default function Home() {
  return (
    <main className="site-stage">
      <section className="iphone" aria-label="Casablancas mobile experience">
        <span className="iphone-button iphone-button-mute" aria-hidden="true" />
        <span className="iphone-button iphone-button-volume-up" aria-hidden="true" />
        <span className="iphone-button iphone-button-volume-down" aria-hidden="true" />
        <span className="iphone-button iphone-button-power" aria-hidden="true" />
        <div className="iphone-screen">
          <iframe
            src="/experience/index.html"
            title="Casablancas artist companion"
            allow="autoplay; microphone"
          />
          <div className="dynamic-island" aria-hidden="true"><i /></div>
          <div className="home-indicator" aria-hidden="true" />
        </div>
      </section>
    </main>
  );
}
