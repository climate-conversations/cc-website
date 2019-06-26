(RaiselyComponents) => class Segment extends React.Component {
	render() {
      const segment = this.props.getValues();

      let pos = [];

      if (segment.position) {
        pos = segment.position.split(' ');
      } else {
        pos = [0,0]
      }

      return <figure className={`segment segment--size-${segment.size} fill--${segment.colour}`} data-colour={segment.colour}>
        <div
          className="segment__shape"
          style={{
          	top: `${pos[0]}`,
            left: `${pos[1]}`
          }}
        >
          {segment.size === 'large' ? (
            <svg
              width="840px"
              height="840px"
              viewBox="0 0 840 840"
              version="1.1"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              style={{transform: `rotate(${segment.rotation}deg)`}}
           >
              <path
                d="M186.139 37.498C-6.164 167.208-56.906 428.25 72.804 620.555c129.71 192.303 390.754 243.044 583.057 113.334s243.045-390.753 113.335-583.057C723.872 83.637 661.203 32.006 588.339.423l-66.813 154.144c43.676 18.93 81.122 49.78 108.391 90.21 77.827 115.382 47.382 272.008-68 349.834-115.382 77.826-272.008 47.381-349.834-68-77.827-115.383-47.382-272.009 68-349.835L186.14 37.498z"
                fillRule="nonzero"
                />
            </svg>
          ) : (
            <svg
              width="399px"
              height="399px"
              viewBox="0 0 399 399"
              version="1.1"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              style={{transform: `rotate(${segment.rotation}deg)`}}
            >
              <path
                d="M267.257 12.695c-103.276-37.59-217.47 15.66-255.06 118.936-37.59 103.277 15.66 217.472 118.936 255.061 103.277 37.59 217.472-15.66 255.061-118.937 13.131-36.076 15.47-74.495 7.283-111.224l-99.557 22.191c3.985 17.878 2.852 36.49-3.574 54.147-18.323 50.341-73.986 76.297-124.327 57.975-50.34-18.323-76.296-73.986-57.974-124.326 18.323-50.341 73.985-76.297 124.326-57.975l34.886-95.848z"
                fillRule="nonzero"
                />
          	</svg>
          )}
        </div>

      </figure>;
    }
}

