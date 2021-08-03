(RaiselyComponents) => class MyRaiselyComponent extends React.Component {
	render() {
		const quote = this.props.getValues();
		return <blockquote className="quote">
          <div className={`quote__text quote--${quote.colour} quote__text--size-${quote.size}`}>{quote.text ? quote.text : "Please enter the quote"}</div>
          {(quote.author || quote.photoUrl) && <div className="quote__author">
            {quote.photoUrl && <span className="quote__author-image" style={{backgroundImage: `url(${quote.photoUrl})`}}></span>}
            <span className="quote__author-name">
              <div>{quote.author}</div>
              {quote.position && <span>, {quote.position}</span>}
            </span>
          </div>}
        </blockquote>;
	}
}