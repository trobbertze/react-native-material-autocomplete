import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import {
  Text,
  View,
  ScrollView,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
  ViewPropTypes,
} from 'react-native';
import { TextField } from 'react-native-material-textfield';

import DropdownItem from '../item';
import styles from './styles';

const minMargin = 8;
const maxMargin = 16;

export default class AutoComplete extends PureComponent {
  static defaultProps = {
    disabled: false,

    rippleInsets: {
      top: 16,
      right: 0,
      bottom: -8,
      left: 0,
    },

    rippleOpacity: 0.54,
    shadeOpacity: 0.12,

    animationDuration: 225,
    fontSize: 16,

    textColor: 'rgba(0, 0, 0, .87)',
    itemColor: 'rgba(0, 0, 0, .54)',
    baseColor: 'rgba(0, 0, 0, .38)',

    itemCount: 4,
    itemPadding: 8,

    labelHeight: 32,

    dropdownPosition: -2,

    showSpinner: false,

    spinner: <Text>Loading</Text>,

    onSelect: null,
  };

  static propTypes = {
    disabled: PropTypes.bool,

    rippleInsets: PropTypes.shape({
      top: PropTypes.number,
      right: PropTypes.number,
      bottom: PropTypes.number,
      left: PropTypes.number,
    }),

    rippleOpacity: PropTypes.number,
    shadeOpacity: PropTypes.number,

    animationDuration: PropTypes.number,
    fontSize: PropTypes.number,

    value: PropTypes.string,
    data: PropTypes.arrayOf(PropTypes.shape({
      value: PropTypes.string,
      label: PropTypes.string,
    })),

    textColor: PropTypes.string,
    itemColor: PropTypes.string,
    selectedItemColor: PropTypes.string,
    baseColor: PropTypes.string,

    itemTextStyle: Text.propTypes.style,

    itemCount: PropTypes.number,
    itemPadding: PropTypes.number,

    labelHeight: PropTypes.number,

    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    onChangeText: PropTypes.func,

    renderBase: PropTypes.func,

    containerStyle: (ViewPropTypes || View.propTypes).style,

    dropdownPosition: PropTypes.number,

    showSpinner: PropTypes.bool,

    spinner: PropTypes.node,

    onSelect: PropTypes.func
  };

  constructor(props) {
    super(props);

    this.onChangeText = this.onChangeText.bind(this);
    this.onClose = this.onClose.bind(this);
    this.onSelect = this.onSelect.bind(this);
    this.updateTextInputRef = this.updateRef.bind(this, 'textInput');
    this.updateRippleRef = this.updateRef.bind(this, 'ripple');
    this.updateContainerRef = this.updateRef.bind(this, 'container');
    this.updateScrollRef = this.updateRef.bind(this, 'scroll');
    this.showDropdown = this.showDropdown.bind(this)

    this.blur = this.onClose;
    // this.focus = this.onChangeText;

    let { value } = this.props;

    this.mounted = false;
    this.state = {
      opacity: new Animated.Value(0),
      selected: -1,
      modal: false,
      value,
    };
  }

  componentDidMount() {
    this.mounted = true;
  }

  componentWillReceiveProps({ value }) {
    if (value !== this.props.value) {
      this.setState({ value });
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  onChangeText(value) {
    this.setState({
      value,
    })
    this.props.onChangeText(value)
    this.showDropdown()
  }

  onClose(cb) {
    let { onBlur, animationDuration } = this.props;
    let { opacity } = this.state;

    Animated
      .timing(opacity, {
        duration: animationDuration,
        toValue: 0,
      })
      .start(() => {
        if ('function' === typeof onBlur) {
          onBlur();
        }

        if (this.mounted) {
          this.setState({ modal: false });
        }
        if (cb && 'function' === typeof cb) {
          cb()
        } else {
          this.setState({ value: '' });
          if (this.props.onSelect) {
            this.props.onSelect('')
          }
        }
      });
  }

  onSelect(index) {
    let { data, animationDuration } = this.props;
    let { value, label } = data[index];

    setTimeout(() => {
      this.onClose(() => {
        this.setState({ value: label });
        if (this.props.onSelect) {
          this.props.onSelect(value)
        }
      })
    }, animationDuration);
  }

  showDropdown() {
    let {
      data = [],
      disabled,
      onFocus,
      labelHeight,
      itemPadding,
      dropdownPosition,
      animationDuration,
    } = this.props;

    if (disabled) {
      return;
    }

    let itemCount = data.length;
    let visibleItemCount = this.visibleItemCount();
    let tailItemCount = this.tailItemCount();
    let timestamp = Date.now();

    if ('function' === typeof onFocus) {
      onFocus();
    }

    let dimensions = Dimensions.get('window');

    this.container.measureInWindow((x, y, containerWidth, containerHeight) => {
      let { opacity } = this.state;

      let delay = Math.max(0, animationDuration - (Date.now() - timestamp));
      let selected = this.selectedIndex();
      let offset = 0;

      if (itemCount > visibleItemCount) {
        if (null == dropdownPosition) {
          switch (selected) {
            case -1:
              break;

            case 0:
            case 1:
              break;

            default:
              if (selected >= itemCount - tailItemCount) {
                offset = this.itemSize() * (itemCount - visibleItemCount);
              } else {
                offset = this.itemSize() * (selected - 1);
              }
          }
        } else {
          if (~selected) {
            if (dropdownPosition < 0) {
              offset = this.itemSize() * (selected - visibleItemCount - dropdownPosition);
            } else {
              offset = this.itemSize() * (selected - dropdownPosition);
            }
          }
        }
      }

      let left = x - maxMargin;
      let leftInset;

      if (left > minMargin) {
        leftInset = maxMargin;
      } else {
        left = minMargin;
        leftInset = minMargin;
      }

      let right = x + containerWidth + maxMargin;
      let rightInset;

      if (dimensions.width - right > minMargin) {
        rightInset = maxMargin;
      } else {
        right = dimensions.width - minMargin;
        rightInset = minMargin;
      }

      let top = y
        + Platform.select({ ios: 1, android: 2 })
        + labelHeight;

      this.setState({
        modal: true,
        width: right - left,
        top: y,
        left,
        leftInset,
        rightInset,
        selected,
        containerX: x,
        containerY: y,
        containerWidth: containerWidth,
        containerHeight: containerHeight
      });

      if (this.props.data.length > 0) {
        setTimeout((() => {
          if (this.mounted) {
            // this.scroll
            //   .scrollTo({ x: 0, y: offset, animated: false });

            Animated
              .timing(opacity, {
                duration: animationDuration,
                toValue: 1,
              })
              .start(() => {
                if (this.mounted && 'ios' === Platform.OS) {
                  let { flashScrollIndicators } = this.scroll;

                  if ('function' === typeof flashScrollIndicators) {
                    flashScrollIndicators.call(this.scroll);
                  }
                }
                this.textInput.focus()
              });
          }
        }), delay);
      }
      this.textInput.focus()
    });
  }

  isFocused() {
    return this.state.modal;
  }

  selectedIndex() {
    let { data = [] } = this.props;

    return data
      .findIndex(({ value }) => value === this.state.value);
  }

  selectedItem() {
    let { data = [] } = this.props;

    return data
      .find(({ value }) => value === this.state.value);
  }

  itemSize() {
    let { fontSize, itemPadding } = this.props;

    return fontSize * 1.5 + itemPadding * 2;
  }

  visibleItemCount() {
    let { data = [], itemCount } = this.props;

    return Math.min(data.length, itemCount);
  }

  tailItemCount() {
    return Math.max(this.visibleItemCount() - 2, 0);
  }

  updateRef(name, ref) {
    this[name] = ref;
  }

  renderBase() {
    let { value } = this.state;
    let {
      containerStyle,
      rippleInsets,
      rippleOpacity,
      renderBase,
      ...props
    } = this.props;

    if ('function' === typeof renderBase) {
      return renderBase({ ...props, label, value });
    }
    if (!props.containerStyle) props.containerStyle = {}
    if (this.state.modal) {
      props.containerStyle.top = this.state.containerY
      props.containerStyle.left = this.state.containerX
      props.containerStyle.width = this.state.containerWidth
    } else {
      props.containerStyle.top = null
      props.containerStyle.left = null
      props.containerStyle.width = null
    }

    return (
      <TextField
        {...props}
        ref={this.updateTextInputRef}
        value={this.state.value}
        autoCorrect={false}
        autoCapitalize="none"
        onChangeText={this.onChangeText}
        animationDuration={this.state.modal ? 0 : 225}
        onFocus={() => {
          if (this.state.value && this.state.value !== '') {
            this.onChangeText(this.state.value)
          }
        }}
      />
    );
  }

  renderItems() {
    let { selected, leftInset, rightInset } = this.state;

    let {
      data = [],
      textColor,
      itemColor,
      selectedItemColor = textColor,
      baseColor,
      fontSize,
      itemTextStyle,
      animationDuration,
      rippleOpacity,
      shadeOpacity,
    } = this.props;

    let props = {
      baseColor,
      fontSize,
      animationDuration,
      rippleOpacity,
      shadeOpacity,
      onChangeText: this.onSelect,
      style: {
        height: this.itemSize(),
        paddingLeft: leftInset,
        paddingRight: rightInset,
      },
    };

    return data
      .map(({ value, label = value }, index) => {
        let color = ~selected?
          index === selected?
            selectedItemColor:
            itemColor:
          selectedItemColor;

        let style = { color, fontSize };

        return (
          <DropdownItem onPress={this.onSelect} index={index} key={index} {...props}>
            <Text style={[itemTextStyle, style]} numberOfLines={1}>
              {label}
            </Text>
          </DropdownItem>
        );
      });
  }

  render() {
    let {
      data = [],
      rippleOpacity,
      rippleInsets,
      containerStyle,
      baseColor,
      animationDuration,
      itemPadding,
      dropdownPosition,
    } = this.props;

    let { left, top, width, opacity, selected, modal } = this.state;

    let dimensions = Dimensions.get('window');

    let itemCount = data.length;
    let visibleItemCount = this.visibleItemCount();
    let tailItemCount = this.tailItemCount();
    let itemSize = this.itemSize();

    let overlayStyle = {
      width: dimensions.width,
      height: dimensions.height,
    };

    let height = 2 * itemPadding + itemSize * visibleItemCount;

    let pickerStyle = {
      width,
      height,
      top,
      left,
      opacity,
    };

    let spinnerStyle = {
      width,
      top,
      left,
    }

    let { bottom, ...insets } = rippleInsets;
    let rippleStyle = {
      ...insets,

      height: itemSize - bottom,
      position: 'absolute',
    };
    if (this.state.modal) this.showDropdown()
    return (
      <View onLayout={() => undefined} ref={this.updateContainerRef} style={containerStyle}>
        {modal ? <View style={{ height: this.state.containerHeight }} /> : this.renderBase()}
        <Modal visible={modal} transparent={true} onRequestClose={this.onClose}>
          {modal ? this.renderBase() : null}
          {this.props.showSpinner ?
            (
              <View style={[styles.spinner, spinnerStyle]}>
                {this.props.spinner}
              </View>
            ) : null}
          {this.props.data.length > 0 ?
            (
              <TouchableWithoutFeedback onPress={this.onClose}>
                <View style={overlayStyle}>
                  <Animated.View style={[styles.picker, pickerStyle]}>
                    <ScrollView
                      ref={this.updateScrollRef}
                      style={styles.scroll}
                      scrollEnabled={visibleItemCount < itemCount}
                      contentContainerStyle={styles.scrollContainer}
                    >
                      {this.renderItems()}
                    </ScrollView>
                  </Animated.View>
                </View>
              </TouchableWithoutFeedback>
            ) : null
          }
        </Modal>
      </View>
    );
  }
}
