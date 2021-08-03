(RaiselyComponents) => class SimpleCard extends React.Component {
	render() {
		const { Link } = RaiselyComponents;
		const card = this.props.getValues();

		console.log(card.link)
		return <article className={`card card--${card.colour}${card.link ? ' card--link' : ''} ${card.image && 'card--has-image'}`}>

          {card.link && <Link className="card__link" href={card.link}/>}

          {card.title && <div className="card__title">
            <h4>{card.title}</h4>
            {card.link && <i className="material-icons">arrow_forward</i>}
          </div>}

          {(card.image || card.text) && <div className="card__content">
            {card.image && <div className="card__content-image" style={{ backgroundImage: `url(${card.image}` }}/>}
            {card.text && <div className="card__content-text">{card.text}</div>}
          </div>}

        </article>;
	}
}
