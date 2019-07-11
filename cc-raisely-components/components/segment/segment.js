(RaiselyComponents) => class Segment extends React.Component {
	render() {
      const segment = this.props.getValues();

      let pos = [];

      if (segment.position) {
        pos = segment.position.split(' ');
      } else {
        pos = [0,0]
      }
      
      const sizes = {
        'small' : 400,
        'medium' : 530,
        'large' : 840,
      }
      
      const size = sizes[segment.size];
      
      const stroke = segment.size === 'large' ? 110 : 130;

      return <figure className={`segment segment--size-${segment.size} stroke--${segment.colour}`} data-colour={segment.colour}>
        <div
          className="segment__shape"
          style={{
          	top: `${pos[0]}`,
            left: `${pos[1]}`
          }}
        >
          <svg
            width={`${size}px`}
            height={`${size}px`}
            viewBox="0 0 534 534"
            version="1.1"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            style={{transform: `rotate(${segment.rotation}deg)`}}
            >
            <circle
              cx={806}
              cy={1403}
              r={202}
              transform="translate(-539.000000, -1136.000000)"
              strokeWidth={stroke}
              fill="none"
              />
          </svg>
        </div>

      </figure>;
    }
}

