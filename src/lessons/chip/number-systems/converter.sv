module top;
  reg [7:0] val;

  initial begin
    val = 8'd170;
    // TODO: display val in binary, hex, decimal, and octal using $display
    // Hint: use %b, %h, %d, %o format specifiers
    $finish;
  end
endmodule
