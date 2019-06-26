(RaiselyComponents) => class TeamCard extends React.Component {
	render() {
		const card = this.props.getValues();
     
      
		return <article className="card">
          
          {card.photo && <div className="card__photo" style={{ backgroundImage: `url(${card.image}` }}/>}
                    
          <h4>{card.name}</h4>
          <span className="card__meta">
            {card.position}
            {card.twitter && <a href={`https://twitter.com/${card.twitter}`}></a>}
          </span>
          
        </article>;
	}
}