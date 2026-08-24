/**
 * In-document affiliation footer — appears when you scroll to the end of the page.
 * Desktop also keeps a copy in the sidebar foot.
 */
export function BoardDisclaimer() {
  return (
    <aside className="board-disclaimer board-disclaimer--scroll" aria-label="Affiliation disclaimer">
      <div className="board-disclaimer__brand">
        <img
          className="board-disclaimer__mark"
          src="/favicon.svg"
          width={22}
          height={22}
          alt=""
        />
        <span className="board-disclaimer__name">Interfold Board</span>
      </div>
      <p className="board-disclaimer__note">
        Not affiliated with the Interfold Foundation.
      </p>
    </aside>
  );
}
